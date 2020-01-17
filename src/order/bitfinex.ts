import { strict as assert } from 'assert';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { convertPriceAndQuantityToStrings } from '../util';

const { RESTv2 } = require('bfx-api-node-rest');
const { Order } = require('bfx-api-node-models');

function createAuthenticatedClient(): any {
  assert.ok(USER_CONFIG.BITFINEX_API_KEY);
  assert.ok(USER_CONFIG.BITFINEX_API_SECRET);

  const rest = new RESTv2({
    apiKey: USER_CONFIG.BITFINEX_API_KEY!,
    apiSecret: USER_CONFIG.BITFINEX_API_SECRET!,
    transform: true, // to have full models returned by all methods
  });

  return rest;
}

export async function placeOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
  clientOrderId?: string,
): Promise<string> {
  assert.ok(pairInfo);

  const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(pairInfo, price, quantity, sell);
  const order: { [key: string]: string | number } = {
    type: 'EXCHANGE LIMIT',
    symbol: `t${pairInfo.raw_pair.toUpperCase()}`,
    price: priceStr,
    amount: `${sell ? '-' : ''}${quantityStr}`, // positive for buy, negative for sell
  };
  if (clientOrderId) {
    order.cid = parseInt(clientOrderId, 10);
  }

  const authClient = createAuthenticatedClient();
  const arr = await authClient.submitOrder(new Order(order));
  return arr[0].toString();
}

export async function cancelOrder(pairInfo: PairInfo, orderId: string): Promise<boolean> {
  assert.ok(pairInfo);

  const authClient = createAuthenticatedClient();
  try {
    const arr = (await authClient.cancelOrder(parseInt(orderId, 10))) as any[];
    const order = Order.unserialize(arr);
    return order.id === parseInt(orderId, 10);
  } catch (e) {
    return false;
  }
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const authClient = createAuthenticatedClient();
  // eslint-disable-next-line no-underscore-dangle
  const arr = await authClient._makeAuthRequest(
    '/auth/r/orders',
    { id: [parseInt(orderId, 10)] },
    undefined,
    Order,
  );

  if (arr.length === 0) return undefined;

  assert.equal(arr.length, 1);
  return arr[0];
}

export async function queryAllBalances(): Promise<{ [key: string]: number }> {
  const authClient = createAuthenticatedClient();

  const wallets = (await authClient.wallets()) as any[];
  const arr = wallets.filter(x => x.type === 'exchange');

  const result: { [key: string]: number } = {};
  arr.forEach(x => {
    if (x.currency === 'HOT') x.currency = 'HYDRO'; // eslint-disable-line  no-param-reassign
    if (x.currency === 'ORS') x.currency = 'ORSGROUP'; // eslint-disable-line  no-param-reassign
    result[x.currency] = x.balance;
  });

  return result;
}
