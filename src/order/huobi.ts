import { strict as assert } from 'assert';
import Axios from 'axios';
import crypto from 'crypto';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { convertPriceAndQuantityToStrings } from '../util';

const DOMAIN = 'api.huobi.pro';
const API_ENDPOINT = `https://${DOMAIN}`;

function signRequest(
  method: 'GET' | 'POST',
  requestPath: string,
  params: { [key: string]: any } = {},
): string {
  assert.ok(USER_CONFIG.HUOBI_ACCESS_KEY);
  assert.ok(USER_CONFIG.HUOBI_SECRET_KEY);
  /* eslint-disable no-param-reassign */
  params.Timestamp = new Date().toISOString().replace(/\..+/, ''); // .getTime()+ Huobi.info.timeOffset;
  params.SignatureMethod = 'HmacSHA256';
  params.SignatureVersion = 2;
  params.AccessKeyId = USER_CONFIG.HUOBI_ACCESS_KEY!;

  const query = Object.keys(params)
    .sort()
    .reduce((a: string[], k) => {
      a.push(`${k}=${encodeURIComponent(params[k])}`);
      return a;
    }, [])
    .join('&');

  const source = `${method}\n${DOMAIN}\n${requestPath}\n${query}`;
  let signature = crypto
    .createHmac('sha256', USER_CONFIG.HUOBI_SECRET_KEY!)
    .update(source)
    .digest('base64'); // digest('hex'); // set the HMAC hash header
  signature = encodeURIComponent(signature);

  return `${API_ENDPOINT}${requestPath}?${query}&Signature=${signature}`;
}

export async function placeOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
  clientOrderId?: string,
): Promise<string> {
  assert.ok(pairInfo);
  assert.ok(USER_CONFIG.HUOBI_ACCESS_KEY);
  assert.ok(USER_CONFIG.HUOBI_SECRET_KEY);
  assert.ok(USER_CONFIG.HUOBI_ACCOUNT_ID);

  const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(pairInfo, price, quantity, sell);

  const path = '/v1/order/orders/place';
  const params: { [key: string]: string } = {
    'account-id': USER_CONFIG.HUOBI_ACCOUNT_ID!.toString(),
    amount: quantityStr,
    price: priceStr,
    symbol: pairInfo.raw_pair,
    type: sell ? 'sell-limit' : 'buy-limit',
  };
  if (clientOrderId) {
    params['client-order-id'] = clientOrderId;
  }

  const fullUrl = signRequest('POST', path, params);

  const response = await Axios.post(fullUrl, params, {
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');
  return response.data.data as string;
}

export async function cancelOrder(pairInfo: PairInfo, orderId: string): Promise<boolean> {
  assert.ok(pairInfo);

  const path = `/v1/order/orders/${orderId}/submitcancel`;

  const params = {};
  const fullUrl = signRequest('POST', path, params);

  const response = await Axios.post(fullUrl, params, {
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');
  return (response.data.data as string) === orderId;
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const path = `/v1/order/orders/${orderId}`;

  const fullUrl = signRequest('GET', path);
  const response = await Axios.get(fullUrl, { headers: { 'Content-Type': 'application/json' } });
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');
  return response.data.data;
}

export async function queryAccounts(): Promise<
  {
    id: number;
    type: 'spot' | 'margin' | 'otc' | 'point' | 'super-margin';
    subtype: string;
    state: 'working' | 'lock';
  }[]
> {
  const path = '/v1/account/accounts';
  const fullUrl = signRequest('GET', path);
  const response = await Axios.get(fullUrl, { headers: { 'Content-Type': 'application/json' } });
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');
  return response.data.data;
}

export async function queryAllBalances(): Promise<{ [key: string]: number }> {
  const path = `/v1/account/accounts/${USER_CONFIG.HUOBI_ACCOUNT_ID!}/balance`;
  const fullUrl = signRequest('GET', path);
  const response = await Axios.get(fullUrl, { headers: { 'Content-Type': 'application/json' } });
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');
  const data = response.data.data as {
    id: number;
    type: 'spot' | 'margin' | 'otc' | 'point' | 'super-margin';
    state: 'working' | 'lock';
    list: { currency: string; type: 'trade' | 'frozen'; balance: string }[];
  };
  assert.equal(data.id, USER_CONFIG.HUOBI_ACCOUNT_ID);
  assert.equal(data.type, 'spot');
  assert.equal(data.state, 'working');

  const result: { [key: string]: number } = {};
  data.list
    .filter(x => x.type === 'trade')
    .forEach(x => {
      result[x.currency.toUpperCase()] = parseFloat(x.balance);
    });
  return result;
}
