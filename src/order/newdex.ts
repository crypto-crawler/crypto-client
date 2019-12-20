import { strict as assert } from 'assert';
import { Serialize } from 'eosjs';
import { PairInfo } from 'exchange-info';
import { getTableRows } from 'eos-utils';
import { USER_CONFIG } from '../config';
import { NewdexOrder } from '../pojo';
import { Bloks } from '../blockchain';
import {
  sendEOSAction,
  sendEOSTokenAction,
  sendTransaction,
  getRandomRpc,
  getRandomApi,
  queryEOSBalance,
  queryEOSTokenBalance,
  EOS_QUANTITY_PRECISION,
} from '../blockchain/eos';

export function createOrder(
  eosAccount: string,
  pairInfo: PairInfo,
  price: string,
  quantity: string,
  sell: boolean,
): Serialize.Action {
  assert.ok(pairInfo);
  assert.ok(eosAccount);

  const memo: NewdexOrder = {
    type: sell ? 'sell-limit' : 'buy-limit',
    symbol: pairInfo.pair_symbol,
    price,
    channel: 'dapp',
    ref: 'coinrace.com',
  };

  const action = sell
    ? sendEOSTokenAction(
        eosAccount,
        'newdexpublic',
        pairInfo.base_symbol.sym.split(',')[1],
        pairInfo.base_symbol.contract,
        quantity,
        JSON.stringify(memo),
      )
    : sendEOSAction(
        eosAccount,
        'newdexpublic',
        (parseFloat(price) * parseFloat(quantity)).toFixed(EOS_QUANTITY_PRECISION),
        JSON.stringify(memo),
      );

  return action;
}

export async function placeOrder(
  pairInfo: PairInfo,
  price: string,
  quantity: string,
  sell: boolean,
): Promise<string> {
  assert.ok(pairInfo);
  assert.ok(USER_CONFIG.eosAccount);

  const action = createOrder(USER_CONFIG.eosAccount!, pairInfo, price, quantity, sell);
  const response = await sendTransaction([action], getRandomApi(USER_CONFIG.eosPrivateKey!));
  return response.transaction_id || response.id;
}

export async function cancelOrder(
  pairInfo: PairInfo,
  transactionId: string,
): Promise<boolean | string> {
  assert.ok(pairInfo);
  assert.ok(transactionId);
  assert.ok(USER_CONFIG.eosAccount);

  const orderId = await Bloks.getOrderId(transactionId);

  const action: Serialize.Action = {
    account: 'newdexpublic',
    name: 'cancelorder',
    authorization: [
      {
        actor: USER_CONFIG.eosAccount!,
        permission: 'active',
      },
    ],
    data: orderId,
  };

  const response = await sendTransaction([action], getRandomApi(USER_CONFIG.eosPrivateKey!));
  return response.transaction_id || response.id;
}

export interface NewdexOrderOnChain {
  order_id: number;
  pair_id: number;
  type: number;
  owner: string;
  placed_time: string;
  remain_quantity: string;
  remain_convert: string;
  price: string;
  contract: string;
  count: number;
}

export async function queryOrder(
  pairInfo: PairInfo,
  transactionId: string,
): Promise<object | undefined> {
  const orderId = await Bloks.getOrderId(transactionId);
  let response = await getTableRows({
    code: 'newdexpublic',
    scope: '...........u1',
    table: 'sellorder',
    lower_bound: orderId.order_id,
    upper_bound: orderId.order_id + 1,
  });
  if (response.rows.length === 0) {
    response = await getTableRows({
      code: 'newdexpublic',
      scope: '...........u1',
      table: 'buyorder',
      lower_bound: orderId.order_id,
      upper_bound: orderId.order_id + 1,
    });
  }
  assert.equal(response.more, false);
  if (response.rows.length === 0) return undefined;
  assert.equal(response.rows.length, 1);

  const order = response.rows[0] as NewdexOrderOnChain;
  const sell = order.type === 2; // 1 buy, 2 sell

  assert.equal(order.owner, USER_CONFIG.eosAccount!);

  assert.equal(
    order.contract,
    sell ? pairInfo.base_symbol.contract : pairInfo.quote_symbol.contract,
  );
  return order;
}

export async function queryBalance(pairInfo: PairInfo, currency: string): Promise<number> {
  if (currency === 'EOS') {
    return queryEOSBalance(USER_CONFIG.eosAccount!, getRandomRpc());
  }
  assert.equal(currency, pairInfo.base_symbol.sym.split(',')[1]);
  return queryEOSTokenBalance(
    USER_CONFIG.eosAccount!,
    currency,
    pairInfo.base_symbol.contract,
    getRandomRpc(),
  );
}
