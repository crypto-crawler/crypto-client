import { strict as assert } from 'assert';
import Axios from 'axios';
import crypto from 'crypto';
import { Market } from 'crypto-markets';
import qs from 'qs';
import { v1 as uuidv1 } from 'uuid';
import { USER_CONFIG } from '../config';
import { DepositAddress, WithdrawalFee } from '../pojo';
import { convertPriceAndQuantityToStrings } from '../util';

const DOMAIN = 'www.bitstamp.net';

function sign(
  apiKey: string,
  apiSecret: string,
  verb: 'GET' | 'POST',
  path: string,
  data: string,
): { [key: string]: any } {
  assert.ok(apiKey);
  assert.ok(apiSecret);
  assert.ok(path);
  assert.ok(data);

  const CONTENT_TYPE = 'application/x-www-form-urlencoded';
  const nonce = uuidv1();
  const timestamp = Date.now();
  const stringToSign = `BITSTAMP ${apiKey}${verb}${DOMAIN}${path}${CONTENT_TYPE}${nonce}${timestamp}v2${data}`;
  const signature = crypto.createHmac('sha256', apiSecret).update(stringToSign).digest('hex');
  const headers: { [key: string]: any } = {
    'X-Auth': `BITSTAMP ${apiKey}`,
    'X-Auth-Signature': signature,
    'X-Auth-Nonce': nonce,
    'X-Auth-Timestamp': timestamp,
    'X-Auth-Version': 'v2',
    'Content-Type': CONTENT_TYPE,
  };

  return headers;
}

function sign_v1(apiKey: string, apiSecret: string, customerId: number, nonce: number): string {
  assert.ok(apiKey);
  assert.ok(apiSecret);
  assert.ok(customerId);
  assert.ok(nonce);

  const message = `${nonce}${customerId}${apiKey}`;

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(message)
    .digest('hex')
    .toUpperCase();

  return signature;
}

async function privateRequestV1(path: string, params: { [key: string]: string }): Promise<any> {
  try {
    assert.ok(!path.includes('/v2/'));

    const nonce = Date.now();

    const signature = sign_v1(
      USER_CONFIG.BITSTAMP_API_KEY!,
      USER_CONFIG.BITSTAMP_API_SECRET!,
      USER_CONFIG.BITSTAMP_USER_ID!,
      nonce,
    );
    Object.assign(params, { key: USER_CONFIG.BITSTAMP_API_KEY!, signature, nonce });
    const payload = qs.stringify(params);

    const response = await Axios.post(`https://${DOMAIN}${path}`, payload).catch((e: Error) => {
      return e;
    });
    if (response instanceof Error) return response;
    assert.equal(response.status, 200);

    if (response.data.error) return new Error(JSON.stringify(response.data.error));

    return response.data;
  } catch (e) {
    return e;
  }
}

async function privateRequestV2(path: string, params: { [key: string]: string }): Promise<any> {
  try {
    assert.ok(USER_CONFIG.BITSTAMP_API_KEY);
    assert.ok(USER_CONFIG.BITSTAMP_API_SECRET);
    assert.ok(path.includes('/v2/'));

    const payload = qs.stringify(params) || '{}';

    const headers = sign(
      USER_CONFIG.BITSTAMP_API_KEY!,
      USER_CONFIG.BITSTAMP_API_SECRET!,
      'POST',
      path,
      payload,
    );

    const response = await Axios.post(`https://${DOMAIN}${path}`, payload, {
      headers,
    }).catch((e: Error) => {
      return e;
    });
    if (response instanceof Error) return response;
    assert.equal(response.status, 200);

    if (response.data.status === 'error') {
      return new Error(JSON.stringify(response.data.reason)); // eslint-disable-line no-underscore-dangle
    }

    return response.data;
  } catch (e) {
    return e;
  }
}

async function privateRequest(path: string, params: { [key: string]: string } = {}): Promise<any> {
  return path.includes('/v2/') ? privateRequestV2(path, params) : privateRequestV1(path, params);
}

export async function placeOrder(
  market: Market,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<string | Error> {
  assert.ok(market);

  const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(market, price, quantity, sell);

  const path = `/api/v2/${sell ? 'sell' : 'buy'}/${market.id}/`;
  const data = await privateRequest(path, { price: priceStr, amount: quantityStr });
  if (data instanceof Error) return data;
  return data.id as string;
}

export async function queryOrder(orderId: string): Promise<{ [key: string]: any } | undefined> {
  const data = await privateRequest('/api/order_status/', { id: orderId });
  if (data instanceof Error) return undefined;
  return data;
}

export async function cancelOrder(orderId: string): Promise<boolean> {
  assert.ok(orderId);

  const data = await privateRequest('/api/v2/cancel_order/', { id: orderId });
  if (data instanceof Error) return false;

  return data.id === parseInt(orderId, 10);
}

export async function queryAllBalances(all = false): Promise<{ [key: string]: number }> {
  const result: { [key: string]: number } = {};

  const data = await privateRequest('/api/v2/balance/');
  if (data instanceof Error) return result;
  const dataTyped = data as { [key: string]: string };

  Object.keys(dataTyped)
    .filter((x) => (all ? x.endsWith('_balance') : x.endsWith('_available')))
    .forEach((key) => {
      const symbol = key.substring(0, key.indexOf('_')).toUpperCase();
      result[symbol] = parseFloat(dataTyped[key]);
    });
  return result;
}

async function fetchDepositAddress(symbol: string): Promise<DepositAddress | undefined> {
  const pathMap: { [key: string]: string } = {
    BCH: '/api/v2/bch_address/',
    BTC: '/api/bitcoin_deposit_address/',
    ETH: '/api/v2/eth_address/',
    LTC: '/api/v2/ltc_address/',
    XRP: '/api/v2/xrp_address/',
  };

  if (!(symbol in pathMap)) return undefined;

  const path = pathMap[symbol];

  const data = await privateRequest(path);
  if (data instanceof Error) return undefined;

  if (path.includes('/v2/')) {
    const dataTyped = data as { address: string; destination_tag?: string };
    return { symbol, platform: symbol, ...dataTyped };
  }

  const address = data as string;
  return { symbol, platform: symbol, address };
}

export async function getDepositAddresses(
  symbols: string[],
): Promise<{ [key: string]: { [key: string]: DepositAddress } }> {
  assert.ok(symbols.length);

  const requests = symbols.map((symbol) => fetchDepositAddress(symbol));
  const arr = await Promise.all(requests);

  const result: { [key: string]: { [key: string]: DepositAddress } } = {};
  arr.forEach((address) => {
    if (address) {
      if (!(address.symbol in result)) result[address.symbol] = {};

      result[address.symbol][address.symbol] = address;
    }
  });

  return result;
}

export function getWithdrawalFees(): { [key: string]: { [key: string]: WithdrawalFee } } {
  const data: { [key: string]: number } = {
    BTC: 0.0005,
    BCH: 0.0001,
    LTC: 0.001,
    ETH: 0.001,
    XRP: 0.02,
    USD: 25,
    EUR: 0.9,
  };

  const result: { [key: string]: { [key: string]: WithdrawalFee } } = {};
  Object.keys(data).forEach((symbol) => {
    result[symbol] = {};

    result[symbol][symbol] = {
      symbol,
      platform: symbol,
      fee: data[symbol],
      min: 0,
    };
  });

  return result;
}

export async function withdraw(
  symbol: string,
  address: string,
  amount: number,
  memo?: string,
): Promise<string | Error> {
  const pathMap: { [key: string]: string } = {
    BCH: '/api/v2/bch_withdrawal/',
    BTC: '/api/bitcoin_withdrawal/',
    ETH: '/api/v2/eth_withdrawal/',
    LTC: '/api/v2/ltc_withdrawal/',
    XRP: '/api/ripple_withdrawal/',
  };

  if (!(symbol in pathMap)) return new Error(`Invalid symbol ${symbol} at Bitstamp`);

  const path = pathMap[symbol];

  const params: { [key: string]: string } = {
    address,
    amount: amount.toString(),
  };
  if (symbol === 'XRP') {
    if (memo !== undefined) {
      params.destination_tag = memo;
    }
  }

  const data = await privateRequest(path, params);
  if (data instanceof Error) return data;

  const dataTyped = data as { id: number };

  return dataTyped.id.toString();
}
