import { strict as assert } from 'assert';
import { AuthenticatedClient, LimitOrder } from 'coinbase-pro';
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
    product_id: pairInfo.id,
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

  return ((arr as unknown) as string) === orderId; // TODO: coinbase-pro need to fix its types
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  try {
    const orderInfo = await client.getOrder(orderId);
    assert.equal(orderInfo.id, orderId);
    assert.equal(orderInfo.product_id, pairInfo.id);

    return orderInfo;
  } catch (e) {
    if (e?.response?.statusCode === 404) {
      return undefined; // orderId not exist
    }
    throw e;
  }
}

export async function queryAllBalances(): Promise<{ [key: string]: number }> {
  const client = createAuthenticatedClient();

  const accounts = await client.getAccounts();

  const result: { [key: string]: number } = {};

  accounts.forEach(account => {
    result[account.currency] = parseFloat(account.available);
  });

  return result;
}
