import { strict as assert } from 'assert';
import Axios from 'axios';
import crypto from 'crypto';
import { normalizeSymbol } from 'crypto-pair';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { Currency } from '../pojo/currency';
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
  /* eslint-enable no-param-reassign */

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

export async function queryAllBalances(all: boolean = false): Promise<{ [key: string]: number }> {
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
    .filter(x => !all && x.type === 'trade')
    .forEach(x => {
      result[normalizeSymbol(x.currency, 'Huobi')] = parseFloat(x.balance);
    });
  return result;
}

export async function fetchCurrencies(): Promise<{
  [key: string]: Currency;
}> {
  const path = '/v2/reference/currencies';

  const response = await Axios.get(`${API_ENDPOINT}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  assert.equal(response.status, 200);
  assert.equal(response.data.code, 200);

  const arr = response.data.data as {
    currency: string;
    instStatus: 'normal' | 'delisted';
    chains: {
      chain: string;
      baseChain: string;
      baseChainProtocol: string;
      isDynamic: boolean;
      depositStatus: 'allowed' | 'prohibited';
      maxTransactFeeWithdraw: string;
      maxWithdrawAmt: string;
      minDepositAmt: string;
      minWithdrawAmt: string;
      numOfConfirmations: number;
      numOfFastConfirmations: 999;
      withdrawFeeType: 'fixed' | 'circulated';
      transactFeeWithdraw?: string;
      minTransactFeeWithdraw?: string;
      withdrawPrecision: 5;
      withdrawQuotaPerDay: string;
      withdrawQuotaPerYear: string;
      withdrawQuotaTotal: string;
      withdrawStatus: 'allowed' | 'prohibited';
    }[];
  }[];

  const result: { [key: string]: Currency } = {};
  arr.forEach(x => {
    const trading = x.instStatus === 'normal';
    const symbol = normalizeSymbol(x.currency, 'Huobi');
    result[symbol] = { symbol, trading, deposit: {}, withdrawal: {} };

    x.chains.forEach(y => {
      let platform: string;
      if (symbol === 'USDT') {
        if (y.chain === 'trc20usdt') platform = 'TRON';
        else if (y.chain === 'usdterc20') platform = 'Ethereum';
        else platform = 'Omni';
      } else {
        platform = y.chain.toUpperCase() === symbol ? symbol : y.chain;
      }

      result[symbol].deposit[platform] = {
        platform,
        enabled: y.depositStatus === 'allowed',
        min: parseFloat(y.minDepositAmt),
      };
      result[symbol].withdrawal[platform] = {
        platform,
        enabled: y.withdrawStatus === 'allowed',
        fee: parseFloat(y.transactFeeWithdraw || y.minTransactFeeWithdraw || '0.0'),
        min: parseFloat(y.minWithdrawAmt),
      };
    });
  });
  return result;
}
