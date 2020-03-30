import { strict as assert } from 'assert';
import Axios from 'axios';
import crypto from 'crypto';
import { Market } from 'crypto-markets';
import { USER_CONFIG } from '../config';
import { convertPriceAndQuantityToStrings } from '../util';
import debug from '../util/debug';
import { Params, sort } from '../util/whaleex_sign';

const API_BASE_URL = 'https://www.mxc.com';

// Only the following pairs are tradable via API, see https://www.mxc.com/ucenter/api
export const SUPPORTED_PAIRS = [
  'ADA_USDT',
  'AE_USDT',
  'ALGO_USDT',
  'ARPA_USDT',
  'BCH_USDT',
  'BNB_USDT',
  'BSV_USDT',
  'BTC_USDT',
  'DASH_USDT',
  'DOGE_USDT',
  'EOS_USDT',
  'ETH_USDT',
  'GRIN_USDT',
  'HT_USDT',
  'IRIS_USDT',
  'LTC_USDT',
  'NAS_USDT',
  'OMG_USDT',
  'ONT_USDT',
  'SERO_USDT',
  'TRX_USDT',
  'VSYS_USDT',
  'XLM_USDT',
  'XRP_USDT',
  'ZEC_USDT',
  'ZIL_USDT',
];

export function checkTradable(pair: string): boolean {
  const tradable = SUPPORTED_PAIRS.includes(pair);
  assert.ok(tradable, `The pair ${pair} is not tradable through API`);
  return tradable;
}

function sign(params: Params, secretKey: string): [string, string] {
  const paramsText = sort(params);
  const signature = crypto
    .createHash('md5')
    .update(`${paramsText}&api_secret=${secretKey}`)
    .digest('hex');
  return [paramsText, signature];
}

export async function placeOrder(
  market: Market,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<string | Error> {
  try {
    assert.ok(market);
    assert.ok(USER_CONFIG.MXC_ACCESS_KEY);
    assert.ok(USER_CONFIG.MXC_SECRET_KEY);

    const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(market, price, quantity, sell);

    const path = '/open/api/v1/private/order';

    const params = {
      api_key: USER_CONFIG.MXC_ACCESS_KEY!,
      req_time: Date.now(),
      market: market.id,
      price: priceStr,
      quantity: quantityStr,
      trade_type: sell ? 2 : 1,
    };
    const [paramsText, signature] = sign(params, USER_CONFIG.MXC_SECRET_KEY!);

    const requestUrl = `${API_BASE_URL}${path}?${paramsText}&sign=${signature}`;
    debug(requestUrl);
    const response = await Axios.post(requestUrl).catch((e: Error) => {
      return e;
    });
    if (response instanceof Error) return response;
    assert.equal(response.status, 200);
    assert.equal(response.data.code, 200);

    return response.data.data;
  } catch (e) {
    debug(e);
    throw e;
  }
}

export async function cancelOrder(market: Market, orderId: string): Promise<boolean> {
  assert.ok(market);

  const path = '/open/api/v1/private/order';

  const params = {
    api_key: USER_CONFIG.MXC_ACCESS_KEY!,
    req_time: Date.now(),
    market: market.id,
    trade_no: orderId,
  };
  const [paramsText, signature] = sign(params, USER_CONFIG.MXC_SECRET_KEY!);

  const requestUrl = `${API_BASE_URL}${path}?${paramsText}&sign=${signature}`;
  debug(requestUrl);
  const response = await Axios.delete(requestUrl);
  assert.equal(response.status, 200);

  return response.status === 200 && response.data.code === 200;
}

export async function queryOrder(
  market: Market,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(market);

  const path = '/open/api/v1/private/order';

  const params: { [key: string]: any } = {
    api_key: USER_CONFIG.MXC_ACCESS_KEY!,
    req_time: Date.now(),
    market: market.id,
    trade_no: orderId,
  };
  const [paramsText, signature] = sign(params, USER_CONFIG.MXC_SECRET_KEY!);

  const requestUrl = `${API_BASE_URL}${path}?${paramsText}&sign=${signature}`;
  debug(requestUrl);
  const response = await Axios.get(requestUrl);
  assert.equal(response.status, 200);
  assert.equal(response.data.code, 200);

  return response.data.data as {
    id: string;
    market: string;
    price: string;
    status: string;
    totalQuantity: string;
    tradedQuantity: string;
    tradedAmount: string;
    createTime: string;
    type: number;
  };
}

async function getAccountInfo(): Promise<{
  [key: string]: { frozen: string; available: string };
}> {
  assert.ok(USER_CONFIG.MXC_ACCESS_KEY);
  assert.ok(USER_CONFIG.MXC_SECRET_KEY);

  const path = '/open/api/v1/private/account/info';

  const params = {
    api_key: USER_CONFIG.MXC_ACCESS_KEY!,
    req_time: Date.now(),
  };
  const [paramsText, signature] = sign(params, USER_CONFIG.MXC_SECRET_KEY!);

  const requestUrl = `${API_BASE_URL}${path}?${paramsText}&sign=${signature}`;
  debug(requestUrl);
  const response = await Axios.get(requestUrl);
  assert.equal(response.status, 200);

  return response.data;
}

export async function queryAllBalances(all = false): Promise<{ [key: string]: number }> {
  const accountInfo = await getAccountInfo();
  const result: { [key: string]: number } = {};

  Object.keys(accountInfo).forEach((symbol) => {
    result[symbol] = all
      ? parseFloat(accountInfo[symbol].available) + parseFloat(accountInfo[symbol].frozen)
      : parseFloat(accountInfo[symbol].available);
  });

  return result;
}
