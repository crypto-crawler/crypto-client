import { strict as assert } from 'assert';
import { Serialize } from 'eosjs';
import getExchangeInfo, { ExchangeInfo, NewdexPairInfo } from 'exchange-info';
import { getTableRows } from 'eos-utils';
import { validatePriceQuantity } from '../util';
import { USER_CONFIG } from '../config';
import { NewdexOrder } from '../pojo';
import { Bloks } from '../blockchain';
import {
  sendEOS,
  sendEOSToken,
  sendTransaction,
  getRandomApi,
  EOS_QUANTITY_PRECISION,
} from '../blockchain/eos';

let NEWDEX_INFO: ExchangeInfo;

export async function placeOrder(
  pair: string,
  price: string,
  quantity: string,
  sell: boolean,
): Promise<string> {
  assert.ok(USER_CONFIG.eosAccount);
  if (NEWDEX_INFO === undefined) {
    NEWDEX_INFO = await getExchangeInfo('Newdex');
  }
  const pairInfo = NEWDEX_INFO.pairs[pair] as NewdexPairInfo;

  if (!validatePriceQuantity(price, quantity, pairInfo)) {
    throw new Error('Validaton on price and quantity failed');
  }

  const memo: NewdexOrder = {
    type: sell ? 'sell-limit' : 'buy-limit',
    symbol: pairInfo.pair_symbol,
    price,
    channel: 'dapp',
    ref: 'coinrace.com',
  };

  const response = sell
    ? await sendEOSToken(
        USER_CONFIG.eosAccount!,
        USER_CONFIG.eosPrivateKey!,
        'newdexpublic',
        pairInfo.base_symbol.sym.split(',')[1],
        pairInfo.base_symbol.contract,
        quantity,
        JSON.stringify(memo),
      )
    : await sendEOS(
        USER_CONFIG.eosAccount!,
        USER_CONFIG.eosPrivateKey!,
        'newdexpublic',
        (parseFloat(price) * parseFloat(quantity)).toFixed(EOS_QUANTITY_PRECISION),
        JSON.stringify(memo),
      );

  const transactionId = response.transaction_id || response.id;
  return transactionId;
}

export async function cancelOrder(pair: string, transactionId: string): Promise<boolean | string> {
  assert.ok(pair);
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

export async function queryOrder(pair: string, transactionId: string): Promise<object | undefined> {
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

  if (NEWDEX_INFO === undefined) {
    NEWDEX_INFO = await getExchangeInfo('Newdex');
  }
  const pairInfo = NEWDEX_INFO.pairs[pair] as NewdexPairInfo;
  assert.equal(
    order.contract,
    sell ? pairInfo.base_symbol.contract : pairInfo.quote_symbol.contract,
  );
  return order;
}
