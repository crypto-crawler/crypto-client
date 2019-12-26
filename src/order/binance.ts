import createClient, { Binance } from 'binance-api-node';
import { strict as assert } from 'assert';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { convertPriceAndQuantityToStrings } from '../util';

function createAuthenticatedClient(): Binance {
  assert.ok(USER_CONFIG.BINANCE_API_KEY);
  assert.ok(USER_CONFIG.BINANCE_API_SECRET);

  return createClient({
    apiKey: USER_CONFIG.BINANCE_API_KEY!,
    apiSecret: USER_CONFIG.BINANCE_API_SECRET!,
  });
}

export async function placeOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<string> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(pairInfo, price, quantity, sell);

  const order = await client.order({
    symbol: pairInfo.raw_pair,
    type: 'LIMIT',
    side: sell ? 'SELL' : 'BUY',
    quantity: quantityStr,
    price: priceStr,
  });

  return order.orderId.toString();
}

export async function cancelOrder(pairInfo: PairInfo, orderId: string): Promise<boolean> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  const cancelResult = await client.cancelOrder({
    symbol: pairInfo.raw_pair,
    orderId: parseInt(orderId, 10),
  });

  return cancelResult.orderId === parseInt(orderId, 10);
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  const orderResult = client.getOrder({
    symbol: pairInfo.raw_pair,
    orderId: parseInt(orderId, 10),
  });

  return orderResult;
}

export async function queryBalance(symbol: string): Promise<number> {
  assert.ok(symbol);
  const client = createAuthenticatedClient();

  const account = await client.accountInfo();
  const arr = account.balances.filter(x => x.asset === symbol);

  return arr.length > 0 ? parseFloat(arr[0].free) : 0;
}
