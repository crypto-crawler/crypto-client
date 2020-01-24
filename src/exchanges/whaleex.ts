// forked from https://github.com/WhaleEx/API/blob/master/sample/nodejs/whaleex-api.js
import { strict as assert } from 'assert';
import Axios from 'axios';
import { getTokenInfo } from 'eos-token-info';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { DepositAddress, WithdrawalFee } from '../pojo';
import { convertPriceAndQuantityToStrings } from '../util';
// import debug from '../util/debug';
import { signData, signDataOrder, SymbolObj, WhaleExOrder } from '../util/whaleex_sign';

const WHALEEX_ACCOUNT = 'whaleextrust';
const URL_PREFIX = 'https://api.whaleex.com/BUSINESS';

async function getGlobalIds(remark = '0'): Promise<{ remark: string; list: string[] }> {
  const path = '/api/v1/order/globalIds';
  const params = signData('GET', path, { remark, size: 100 });
  const response = await Axios.get(`${URL_PREFIX}${path}?${params}`);
  assert.equal(response.status, 200);
  assert.equal(response.data.returnCode, '0');

  return response.data.result as { remark: string; list: string[] };
}

const ID_CACHE = { remark: '0', list: [] as string[], lastTimestamp: Date.now() };

async function getIdFromCache(): Promise<string> {
  const now = Date.now();
  // IDs expire after 5 minutes, so update them per 4 minutes
  if (ID_CACHE.list.length === 0 || now - ID_CACHE.lastTimestamp >= 4 * 60 * 1000) {
    const { remark, list } = await getGlobalIds(ID_CACHE.remark);
    ID_CACHE.remark = remark;
    ID_CACHE.list = list;
    ID_CACHE.lastTimestamp = now;
  }
  return ID_CACHE.list.pop()!;
}

export async function initilize(apiKey: string, userId: string): Promise<void> {
  assert.ok(apiKey);
  assert.ok(userId);
  USER_CONFIG.WHALEEX_API_KEY = apiKey;
  USER_CONFIG.WHALEEX_USER_ID = userId;

  const { remark, list } = await getGlobalIds(ID_CACHE.remark);
  ID_CACHE.remark = remark;
  ID_CACHE.list = list;
  ID_CACHE.lastTimestamp = Date.now();
}

export async function placeOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<string> {
  assert.ok(pairInfo);
  assert.ok(USER_CONFIG.WHALEEX_API_KEY, 'APIKey is empty');

  const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(pairInfo, price, quantity, sell);

  const path = '/api/v1/order/orders/place';

  const order: WhaleExOrder = {
    orderId: await getIdFromCache(),
    amount: quantityStr,
    price: priceStr,
    symbol: pairInfo.raw_pair,
    type: sell ? 'sell-limit' : 'buy-limit',
  };

  let baseToken = pairInfo.normalized_pair.split('_')[0];
  if (baseToken === 'MYKEY') baseToken = 'KEY';

  const symbolObj: SymbolObj = {
    baseToken,
    quoteToken: pairInfo.normalized_pair.split('_')[1],
    basePrecision: pairInfo.base_precision,
    quotePrecision: pairInfo.quote_precision,
    baseContract: pairInfo.base_contract!,
    quoteContract: pairInfo.quote_contract!,
  };
  const params = signDataOrder(order, symbolObj);

  const response = await Axios.post(`${URL_PREFIX}${path}?${params}`, order, {
    transformResponse: resp => {
      return JSON.parse(resp.replace(/"result":(\d+)/g, '"result":"$1"'));
    },
    responseType: 'json',
  });
  assert.equal(response.status, 200);

  if (response.data.returnCode === '0') {
    assert.equal(typeof response.data.result, 'string');
    return response.data.result as string;
  }
  throw new Error(JSON.stringify(response.data));
}

export async function cancelOrder(pairInfo: PairInfo, orderId: string): Promise<boolean> {
  assert.ok(pairInfo);
  assert.ok(USER_CONFIG.WHALEEX_API_KEY);

  const path = `/api/v1/order/orders/${orderId}/submitcancel`;
  const params = signData('POST', path);

  const response = await Axios.post(`${URL_PREFIX}${path}?${params}`);

  return response.status === 200 && response.data.returnCode === '0';
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);
  assert.ok(USER_CONFIG.WHALEEX_API_KEY);

  const path = `/api/v1/order/orders/${orderId}`;
  const params = signData('GET', path);
  const response = await Axios.get(`${URL_PREFIX}${path}?${params}`);
  assert.equal(response.status, 200);
  if (response.data.returnCode === '0') {
    return response.data.result;
  }
  return undefined;
}

// for debug only
export async function queryOpenOrder(sell = false): Promise<{ [key: string]: any } | undefined> {
  const path = '/api/v1/order/openOrders';
  const params = signData('GET', path, { side: sell ? 'sell' : 'buy' });
  const response = await Axios.get(`${URL_PREFIX}${path}?${params}`);
  assert.equal(response.status, 200);

  if (response.data.returnCode === '0') {
    return response.data.result.content;
  }
  return undefined;
}

export async function queryAllBalances(): Promise<{ [key: string]: number }> {
  const path = '/api/v1/assets';
  const params = signData('GET', path);
  const response = await Axios.get(`${URL_PREFIX}${path}?${params}`);
  assert.equal(response.status, 200);

  if (response.data.returnCode !== '0') {
    return {};
  }
  const arr = response.data.result.list.content as {
    currency: string;
    currencyId: number;
    baseChain: string;
    totalAmount: string;
    stakeAmount: string;
    unStakingAmount: string;
    availableAmount: string;
    frozenAmount: string;
    fixedAmount: string;
    privatePlacement: string;
    listed: boolean;
    chainAmount: string;
    timestamp: number;
  }[];

  const result: { [key: string]: number } = {};
  arr.forEach(x => {
    const symbol = x.currency === 'KEY' ? 'MYKEY' : x.currency;
    result[symbol] = parseFloat(x.availableAmount);
  });

  return result;
}

export async function queryBalance(symbol: string): Promise<number> {
  const path = `/api/v1/asset/${symbol}`;
  const params = signData('GET', path);
  const response = await Axios.get(`${URL_PREFIX}${path}?${params}`);
  assert.equal(response.status, 200);

  if (response.data.returnCode !== '0') {
    return 0;
  }
  assert.equal(symbol, response.data.result.currency);
  const total = parseFloat(response.data.result.total);
  const frozen = parseFloat(response.data.result.frozen);
  assert(total >= frozen);
  return total - frozen;
}

export function getWithdrawalFees(symbols: string[]): { [key: string]: WithdrawalFee } {
  assert.ok(USER_CONFIG.WHALEEX_API_KEY, 'WHALEEX_API_KEY is empty');
  assert.ok(USER_CONFIG.WHALEEX_USER_ID, 'WHALEEX_USER_ID is empty');

  const result: { [key: string]: WithdrawalFee } = {};

  symbols.forEach(symbol => {
    if (getTokenInfo(symbol) === undefined) return;

    result[symbol] = {
      symbol,
      deposit_enabled: true,
      withdraw_enabled: true,
      withdrawal_fee: 0,
      min_withdraw_amount: 0,
    };
    if (symbol === 'USDT') {
      result[symbol].subtype = 'EOS';
    }
  });

  return result;
}

export function getDepositAddresses(symbols: string[]): { [key: string]: DepositAddress } {
  assert.ok(USER_CONFIG.WHALEEX_API_KEY, 'WHALEEX_API_KEY is empty');
  assert.ok(USER_CONFIG.WHALEEX_USER_ID, 'WHALEEX_USER_ID is empty');

  const result: { [key: string]: DepositAddress } = {};

  symbols.forEach(symbol => {
    if (getTokenInfo(symbol) === undefined) return;

    result[symbol] = {
      symbol,
      address: WHALEEX_ACCOUNT,
      memo: USER_CONFIG.WHALEEX_USER_ID,
    };
    if (symbol === 'USDT') {
      result[symbol].subtype = 'EOS';
    }
  });

  return result;
}
