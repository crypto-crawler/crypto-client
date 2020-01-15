import assert from 'assert';
import Axios from 'axios';
import crypto from 'crypto';
import { PairInfo } from 'exchange-info';
import qs from 'qs';
import { USER_CONFIG } from '../config';
import { convertPriceAndQuantityToStrings } from '../util';

const API_ENDPOINT = 'https://api.kraken.com';

function generateNonce(): number {
  return Date.now() * 1000;
}

function getSignature(
  path: string,
  params: { nonce: number; [key: string]: string | number },
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
  params: { nonce: number; [key: string]: string | number },
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
): Promise<string> {
  assert.ok(pairInfo);
  assert.ok(USER_CONFIG.KRAKEN_PRIVATE_KEY);
  assert.ok(USER_CONFIG.KRAKEN_PRIVATE_KEY);

  const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(pairInfo, price, quantity, sell);
  assert.ok(priceStr);
  assert.ok(quantityStr);

  const path = '/0/private/AddOrder';

  const params: { nonce: number; [key: string]: string | number } = {
    pair: pairInfo.altname,
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

/* eslint-disable no-param-reassign */
function normalizeSymbol(symbol: string): string {
  // https://support.kraken.com/hc/en-us/articles/360001185506-How-to-interpret-asset-codes
  if (symbol.length === 4 && (symbol[0] === 'X' || symbol[0] === 'Z')) symbol = symbol.substring(1);
  if (symbol === 'XBT') symbol = 'BTC';
  if (symbol === 'XDG') symbol = 'DOGE';
  return symbol;
}
/* eslint-enable no-param-reassign */

export async function queryAllBalances(): Promise<{ [key: string]: number }> {
  const path = '/0/private/Balance';

  const balances = (await privateMethod(path, { nonce: generateNonce() })) as {
    [key: string]: string;
  };

  const result: { [key: string]: number } = {};
  Object.keys(balances).forEach(symbol => {
    const symbolNormalized = normalizeSymbol(symbol);
    result[symbolNormalized] = parseFloat(balances[symbol]);
  });

  return result;
}
