import { AuthenticatedClient } from '@okfe/okex-node';
import { strict as assert } from 'assert';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { convertPriceAndQuantityToStrings } from '../util';

function createAuthenticatedClient(): any {
  assert.ok(USER_CONFIG.OKEX_SPOT_API_KEY);
  assert.ok(USER_CONFIG.OKEX_SPOT_API_SECRET);
  assert.ok(USER_CONFIG.OKEX_SPOT_API_PASSPHRASE);

  const authClient = AuthenticatedClient(
    USER_CONFIG.OKEX_SPOT_API_KEY!,
    USER_CONFIG.OKEX_SPOT_API_SECRET!,
    USER_CONFIG.OKEX_SPOT_API_PASSPHRASE!,
    'https://www.okex.com',
    6000,
  );
  return authClient;
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

  const params: { [key: string]: string } = {
    type: 'limit',
    side: sell ? 'sell' : 'buy',
    instrument_id: pairInfo.raw_pair,
    price: priceStr,
    size: quantityStr,
  };
  if (clientOrderId) {
    params.client_oid = clientOrderId;
  }

  const authClient = createAuthenticatedClient();
  const data = await authClient.spot().postOrder(params);
  if (data.error_code) throw new Error(data.error_message);

  return data.order_id;
}

export async function cancelOrder(
  pairInfo: PairInfo,
  orderId: string,
  clientOrderId?: string,
): Promise<boolean> {
  assert.ok(pairInfo);

  const params: { [key: string]: string } = {
    instrument_id: pairInfo.raw_pair,
  };
  if (clientOrderId) {
    params.client_oid = clientOrderId;
  }

  const authClient = createAuthenticatedClient();
  const data = await authClient.spot().postCancelOrder(clientOrderId || orderId, params);
  return data.result;
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
  clientOrderId?: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const params = {
    instrument_id: pairInfo.raw_pair,
  };

  const authClient = createAuthenticatedClient();
  const data = await authClient.spot().getOrder(clientOrderId || orderId, params);
  return data;
}

export async function queryAllBalances(): Promise<{ [key: string]: number }> {
  const authClient = createAuthenticatedClient();
  const arr = (await authClient.spot().getAccounts()) as {
    id: string;
    currency: string;
    balance: string;
    available: string;
    frozen: string;
    hold: string;
    holds: string;
  }[];

  const result: { [key: string]: number } = {};
  arr.forEach(x => {
    result[x.currency] = parseFloat(x.available);
  });
  return result;
}

export async function queryBalance(symbol: string): Promise<number> {
  const authClient = createAuthenticatedClient();
  const data = (await authClient.spot().getAccounts(symbol)) as {
    id: string;
    currency: string;
    balance: string;
    available: string;
    frozen: string;
    hold: string;
    holds: string;
  };

  return parseFloat(data.available);
}
