import { AuthenticatedClient, LimitOrder } from 'coinbase-pro';
import { strict as assert } from 'assert';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { convertPriceAndQuantityToStrings } from '../util';

function createAuthenticatedClient(): AuthenticatedClient {
  assert.ok(USER_CONFIG.CB_ACCESS_KEY);
  assert.ok(USER_CONFIG.CB_ACCESS_SECRET);
  assert.ok(USER_CONFIG.CB_ACCESS_PASSPHRASE);

  return new AuthenticatedClient(
    USER_CONFIG.CB_ACCESS_KEY!,
    USER_CONFIG.CB_ACCESS_SECRET!,
    USER_CONFIG.CB_ACCESS_PASSPHRASE!,
  );
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

  const order: LimitOrder = {
    type: 'limit',
    side: sell ? 'sell' : 'buy',
    product_id: pairInfo.product_id,
    price: priceStr,
    size: quantityStr,
  };

  const orderResult = await client.placeOrder(order);
  return orderResult.id;
}

export async function cancelOrder(pairInfo: PairInfo, orderId: string): Promise<boolean> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  const arr = await client.cancelOrder(orderId);
  // TODO:
  console.info(arr);
  assert.equal(arr.length, 1);

  return true;
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  const orderInfo = await client.getOrder(orderId);
  assert.equal(orderInfo.id, orderId);
  assert.equal(orderInfo.product_id, pairInfo.product_id);

  // TODO: 404

  return orderInfo;
}

export async function queryBalance(symbol: string): Promise<number> {
  assert.ok(symbol);
  const client = createAuthenticatedClient();

  const accounts = await client.getCoinbaseAccounts();

  console.info(accounts);

  const arr = accounts.filter(x => x.currency === symbol);

  return arr.length > 0 ? arr[0].balance : 0;
}
