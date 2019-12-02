// forked from https://github.com/WhaleEx/API/blob/master/sample/nodejs/whaleex-api.js
import { strict as assert } from 'assert';
import Axios from 'axios';
import getExchangeInfo, { ExchangeInfo, WhaleExPairInfo } from 'exchange-info';
// import debug from '../util/debug';
import { signData, signDataOrder, SymbolObj, WhaleExOrder } from '../util/whaleex_sign';
import { USER_CONFIG } from '../config';

let WHALEEX_INFO: ExchangeInfo;

const URL_PREFIX = 'https://api.whaleex.com/BUSINESS';

async function getGlobalIds(remark = '0'): Promise<{ remark: string; list: string[] }> {
  const path = '/api/v1/order/globalIds';
  const params = signData('GET', path, { remark, size: 100 });
  const response = await Axios.get(`${URL_PREFIX}${path}?${params}`);
  assert.equal(response.status, 200);
  assert.equal(response.data.returnCode, '0');

  const tmp = response.data.result as { remark: string; list: string[] };
  console.info(`Calling getGlobalIds(remark:${remark}), new remark=${tmp.remark}`); // eslint-disable-line no-console
  return tmp;
}

/**
 * Get and cache global IDs.
 *
 * Usage:
 * const idStore = await createIdStore();
 * const id = await idStore.getId();
 */
async function createIdStore(): Promise<{ getId: () => Promise<string> }> {
  let { remark, list } = await getGlobalIds();
  return {
    getId: async (): Promise<string> => {
      if (list.length === 0) {
        const { remark: _remark, list: _ids } = await getGlobalIds(remark);
        remark = _remark;
        list = _ids;
      }
      return list.pop()!;
    },
  };
}

const ID_STORE: { getId: () => Promise<string> } = {
  getId: async (): Promise<string> => {
    console.error('Please initilize ID_STORE'); // eslint-disable-line no-console
    return '0';
  },
};

export async function initilize(apiKey: string): Promise<void> {
  USER_CONFIG.whaleExApiKey = apiKey;
  const idStore = await createIdStore();
  ID_STORE.getId = idStore.getId;
}

export async function placeOrder(
  pair: string,
  price: string,
  quantity: string,
  sell: boolean,
): Promise<string> {
  if (WHALEEX_INFO === undefined) {
    WHALEEX_INFO = await getExchangeInfo('WhaleEx');
  }
  const pairInfo = WHALEEX_INFO.pairs[pair] as WhaleExPairInfo;

  const path = '/api/v1/order/orders/place';

  const order: WhaleExOrder = {
    orderId: await ID_STORE.getId(),
    amount: quantity,
    price,
    symbol: pairInfo.raw_pair,
    type: sell ? 'sell-limit' : 'buy-limit',
  };
  const symbolObj: SymbolObj = {
    baseToken: pair.split('_')[0],
    quoteToken: pair.split('_')[1],
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

export async function cancelOrder(pair: string, orderId: string): Promise<boolean> {
  assert.ok(pair);
  const path = `/api/v1/order/orders/${orderId}/submitcancel`;
  const params = signData('POST', path);

  const response = await Axios.post(`${URL_PREFIX}${path}?${params}`);

  return response.status === 200 && response.data.returnCode === '0';
}

export async function queryOrder(pair: string, orderId: string): Promise<object | undefined> {
  assert.ok(pair);
  const path = `/api/v1/order/orders/${orderId}`;
  const params = signData('GET', path);
  const response = await Axios.get(`${URL_PREFIX}${path}?${params}`);
  assert.equal(response.status, 200);
  if (response.data.returnCode === '0') {
    return response.data;
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
