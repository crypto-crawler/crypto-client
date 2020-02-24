import assert from 'assert';
import Axios from 'axios';
import crypto from 'crypto';
import { normalizeSymbol } from 'crypto-pair';
import { PairInfo } from 'exchange-info';
import qs from 'qs';
import { USER_CONFIG } from '../config';
import { DepositAddress } from '../pojo';
import { convertPriceAndQuantityToStrings, detectPlatform, FIAT_SYMBOLS, sleep } from '../util';

const API_ENDPOINT = 'https://api.kraken.com';

function generateNonce(): number {
  return Date.now() * 1000;
}

function getSignature(
  path: string,
  params: { nonce: number; [key: string]: string | number | boolean },
  privateKey: string,
): string {
  const message = qs.stringify(params);
  const decryptedKey = Buffer.from(privateKey, 'base64');

  const hashDigest = crypto
    .createHash('sha256')
    .update(params.nonce + message)
    .digest('latin1');
  const hmacDigest = crypto
    .createHmac('sha512', decryptedKey)
    .update(path + hashDigest, 'latin1')
    .digest('base64');

  return hmacDigest;
}

async function privateMethod(
  path: string,
  params: { nonce: number; [key: string]: string | number | boolean },
): Promise<any> {
  assert.ok(USER_CONFIG.KRAKEN_API_KEY);
  assert.ok(USER_CONFIG.KRAKEN_PRIVATE_KEY);
  assert.ok(params.nonce);

  const url = `${API_ENDPOINT}${path}`;

  const signature = getSignature(path, params, USER_CONFIG.KRAKEN_PRIVATE_KEY!);
  const headers = {
    'API-Key': USER_CONFIG.KRAKEN_API_KEY!,
    'API-Sign': signature,
  };

  const response = await Axios.post(url, qs.stringify(params), { headers });
  assert.equal(response.status, 200);

  if (response.data.error.length > 0) {
    throw new Error((response.data.error as string[]).join('\n'));
  }
  return response.data.result;
}

export async function placeOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
  clientOrderId?: string,
): Promise<string | Error> {
  try {
    assert.ok(pairInfo);
    assert.ok(USER_CONFIG.KRAKEN_PRIVATE_KEY);
    assert.ok(USER_CONFIG.KRAKEN_PRIVATE_KEY);

    const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(
      pairInfo,
      price,
      quantity,
      sell,
    );
    assert.ok(priceStr);
    assert.ok(quantityStr);

    const path = '/0/private/AddOrder';

    const params: { nonce: number; [key: string]: string | number } = {
      pair: pairInfo.raw_pair,
      type: sell ? 'sell' : 'buy',
      ordertype: 'limit',
      price,
      volume: quantity,
      nonce: generateNonce(),
    };
    if (clientOrderId) {
      params.userref = parseInt(clientOrderId, 10);
    }

    const data = await privateMethod(path, params);
    const txid = data.txid as string[];
    assert.ok(txid.length > 0);
    return txid[0]; // TODO: handle txid.length > 1
  } catch (e) {
    return e;
  }
}

export async function cancelOrder(
  pairInfo: PairInfo,
  orderId: string,
  clientOrderId?: string,
): Promise<boolean> {
  assert.ok(pairInfo);

  const path = '/0/private/CancelOrder';

  const params: { nonce: number; [key: string]: string | number } = {
    txid: orderId,
    nonce: generateNonce(),
  };
  if (clientOrderId) {
    params.txid = parseInt(clientOrderId, 10);
  }

  const data = (await privateMethod(path, params)) as { count: number };
  return data.count > 0;
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
  clientOrderId?: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const path = '/0/private/QueryOrders';

  const params: { nonce: number; [key: string]: string | number } = {
    txid: orderId,
    nonce: generateNonce(),
  };
  if (clientOrderId) {
    params.userref = parseInt(clientOrderId, 10);
  }

  const data = await privateMethod(path, params);
  return data[orderId];
}

export async function queryAllBalances(): Promise<{ [key: string]: number }> {
  const path = '/0/private/Balance';

  const balances = (await privateMethod(path, { nonce: generateNonce() })) as {
    [key: string]: string;
  };

  const result: { [key: string]: number } = {};
  Object.keys(balances).forEach(symbol => {
    const symbolNormalized = normalizeSymbol(symbol, 'Kraken');
    result[symbolNormalized] = parseFloat(balances[symbol]);
  });

  return result;
}

async function getDepositMethod(
  symbol: string,
): Promise<{
  method: string;
  limit: boolean | string;
  fee: string;
  'gen-address': boolean;
}> {
  assert.ok(symbol);
  assert.ok(
    !FIAT_SYMBOLS.includes(symbol),
    `Fiat currency ${symbol} is not supported, only cryptocurrencies are supported`,
  );

  if (symbol === 'DOGE') symbol = 'XDG'; // eslint-disable-line no-param-reassign
  if (symbol === 'USDT') {
    // see https://support.kraken.com/hc/en-us/requests/2732113
    return {
      method: 'Tether USD',
      limit: false,
      fee: '0.00000000',
      'gen-address': true,
    };
  }

  const path = '/0/private/DepositMethods';

  const params: { nonce: number; [key: string]: string | number } = {
    asset: symbol,
    nonce: generateNonce(),
  };

  const arr = (await privateMethod(path, params)) as readonly {
    method: string;
    limit: boolean | string;
    fee: string;
    'gen-address': boolean;
  }[];

  assert.equal(arr.length, 1);

  return arr[0];
}

export async function getDepositAddress(
  symbol: string,
  generateNew: boolean = false,
): Promise<DepositAddress | undefined> {
  assert.ok(symbol);
  assert.ok(
    !FIAT_SYMBOLS.includes(symbol),
    `Fiat currency ${symbol} is not supported, only cryptocurrencies are supported`,
  );

  const depositMethod = await getDepositMethod(symbol);

  const path = '/0/private/DepositAddresses';

  const params: { nonce: number; [key: string]: string | number | boolean } = {
    asset: symbol === 'DOGE' ? 'XDG' : symbol,
    method: depositMethod.method,
    nonce: generateNonce(),
  };
  if (generateNew) params.new = true;

  const arr = (await privateMethod(path, params)) as readonly {
    address: string;
    expiretm: string;
    memo?: string;
  }[];
  if (arr.length <= 0) return undefined;

  const address = arr[0];

  const platform: string = detectPlatform(address.address, symbol) || symbol;

  const result: DepositAddress = {
    symbol,
    platform,
    address: address.address,
  };
  if (address.memo) result.memo = address.memo;
  if (parseFloat(depositMethod.fee) > 0) result.fee = parseFloat(depositMethod.fee);
  if (typeof depositMethod.limit === 'string')
    result.max_deposit_amount = parseFloat(depositMethod.limit);

  return result;
}

export async function getDepositAddresses(
  symbols: string[],
): Promise<{ [key: string]: { [key: string]: DepositAddress } }> {
  assert.ok(symbols.length);
  symbols = symbols.filter(symbol => !FIAT_SYMBOLS.includes(symbol)); // eslint-disable-line no-param-reassign

  const result: { [key: string]: { [key: string]: DepositAddress } } = {};

  for (let i = 0; i < symbols.length; i += 1) {
    const symbol = symbols[i];
    if (!(symbol in result)) result[symbol] = {};

    const data = await getDepositAddress(symbol); // eslint-disable-line no-await-in-loop
    await sleep(3000); // eslint-disable-line no-await-in-loop
    if (data) {
      result[symbol][data.platform] = data;
    } else {
      // generate new address
      const newAddress = await getDepositAddress(symbol, true); // eslint-disable-line no-await-in-loop
      await sleep(3000); // eslint-disable-line no-await-in-loop
      if (newAddress) {
        result[symbol][newAddress.platform] = newAddress;
      }
    }
  }

  return result;
}
