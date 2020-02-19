import { strict as assert } from 'assert';
import Axios from 'axios';
import crypto from 'crypto';
import { PairInfo } from 'exchange-info';
import uuidv1 from 'uuid/v1';
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
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(stringToSign)
    .digest('hex');
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

export async function placeOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<string> {
  assert.ok(pairInfo);
  assert.ok(USER_CONFIG.BITSTAMP_API_KEY);
  assert.ok(USER_CONFIG.BITSTAMP_API_SECRET);

  const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(pairInfo, price, quantity, sell);

  const path = `/api/v2/${sell ? 'sell' : 'buy'}/${pairInfo.raw_pair}/`;

  const payload = `price=${priceStr}&amount=${quantityStr}`;
  const headers = sign(
    USER_CONFIG.BITSTAMP_API_KEY!,
    USER_CONFIG.BITSTAMP_API_SECRET!,
    'POST',
    path,
    payload,
  );

  const response = await Axios.post(`https://${DOMAIN}${path}`, payload, {
    headers,
  });
  assert.equal(response.status, 200);

  if (response.data.status === 'error') {
    throw new Error(response.data.reason.__all__[0] as string); // eslint-disable-line no-underscore-dangle
  }

  return response.data.id;
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const path = '/api/order_status/';

  const nonce = Date.now();
  const signature = sign_v1(
    USER_CONFIG.BITSTAMP_API_KEY!,
    USER_CONFIG.BITSTAMP_API_SECRET!,
    USER_CONFIG.BITSTAMP_USER_ID!,
    nonce,
  );
  const payload = `id=${orderId}&key=${USER_CONFIG.BITSTAMP_API_KEY!}&signature=${signature}&nonce=${nonce}`;

  const response = await Axios.post(`https://${DOMAIN}${path}`, payload);
  assert.equal(response.status, 200);

  return response.data.error ? undefined : response.data;
}

export async function cancelOrder(pairInfo: PairInfo, orderId: string): Promise<boolean> {
  assert.ok(pairInfo);
  assert.ok(orderId);

  const path = '/api/v2/cancel_order/';

  const payload = `id=${orderId}`;
  const headers = sign(
    USER_CONFIG.BITSTAMP_API_KEY!,
    USER_CONFIG.BITSTAMP_API_SECRET!,
    'POST',
    path,
    payload,
  );

  const response = await Axios.post(`https://${DOMAIN}${path}`, payload, {
    headers,
  });
  assert.equal(response.status, 200);

  return response.data.id.toString() === orderId;
}

export async function queryAllBalances(all: boolean = false): Promise<{ [key: string]: number }> {
  const path = '/api/v2/balance/';

  const payload = '{}';
  const headers = sign(
    USER_CONFIG.BITSTAMP_API_KEY!,
    USER_CONFIG.BITSTAMP_API_SECRET!,
    'POST',
    path,
    payload,
  );

  const response = await Axios.post(`https://${DOMAIN}${path}`, payload, {
    headers,
  });
  assert.equal(response.status, 200);

  const result: { [key: string]: number } = {};
  Object.keys(response.data)
    .filter(x =>
      all ? x.endsWith('_available') || x.endsWith('_reserved') : x.endsWith('_available'),
    )
    .forEach(key => {
      const symbol = key.substring(0, key.indexOf('_')).toUpperCase();
      result[symbol] = parseFloat(response.data[key] as string);
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

  if (symbol === 'BTC') {
    const nonce = Date.now();
    const signature = sign_v1(
      USER_CONFIG.BITSTAMP_API_KEY!,
      USER_CONFIG.BITSTAMP_API_SECRET!,
      USER_CONFIG.BITSTAMP_USER_ID!,
      nonce,
    );
    const payload = `key=${USER_CONFIG.BITSTAMP_API_KEY!}&signature=${signature}&nonce=${nonce}`;

    const response = await Axios.post(`https://${DOMAIN}${path}`, payload);
    assert.equal(response.status, 200);

    return { symbol, platform: symbol, address: response.data };
  }

  const payload = '{}';
  const headers = sign(
    USER_CONFIG.BITSTAMP_API_KEY!,
    USER_CONFIG.BITSTAMP_API_SECRET!,
    'POST',
    path,
    payload,
  );

  const response = await Axios.post(`https://${DOMAIN}${path}`, payload, {
    headers,
  });
  assert.equal(response.status, 200);

  return { symbol, platform: symbol, address: response.data.address };
}

export async function getDepositAddresses(
  symbols: string[],
): Promise<{ [key: string]: { [key: string]: DepositAddress } }> {
  assert.ok(symbols.length);

  const requests = symbols.map(symbol => fetchDepositAddress(symbol));
  const arr = await Promise.all(requests);

  const result: { [key: string]: { [key: string]: DepositAddress } } = {};
  arr.forEach(address => {
    if (address) {
      if (!(address.symbol in result)) result[address.symbol] = {};

      result[address.symbol][address.symbol] = address;
    }
  });

  return result;
}

export function getWithdrawalFees(symbols: string[]): { [key: string]: WithdrawalFee } {
  assert.ok(symbols.length);

  const data: { [key: string]: number } = {
    BTC: 0.0005,
    BCH: 0.0001,
    LTC: 0.001,
    ETH: 0.001,
    XRP: 0.02,
    USD: 25,
    EUR: 0.9,
  };

  const result: { [key: string]: WithdrawalFee } = {};
  Object.keys(data).forEach(symbol => {
    result[symbol] = {
      symbol,
      platform: symbol,
      withdrawal_fee: data[symbol],
      min_withdraw_amount: 0,
    };
  });

  return result;
}
