import BigNumber from 'bignumber.js';
import { strict as assert } from 'assert';
import { PairInfo } from 'exchange-info';
import { createTransferAction, EOS_QUANTITY_PRECISION } from 'eos-utils';
import { numberToString } from '../util';
import { ActionExtended } from '../pojo';
import { USER_CONFIG } from '../config';

function createOrderId(): string {
  const orderId = new BigNumber(Math.floor(Date.now() / 1000))
    .times(65536)
    .plus(Math.floor(Math.random() * 65535))
    .toString();
  // add a whitespace per 12 digits
  return orderId.match(/.{1,12}/g)!.join(' ');
}

// eslint-disable-next-line import/prefer-default-export
export function createOrder(
  pairInfo: PairInfo,
  price: string,
  quantity: string,
  sell: boolean,
): ActionExtended {
  assert.ok(pairInfo);
  assert.ok(USER_CONFIG.eosAccount);
  assert.equal(pairInfo.quote_contract, 'eosio.token');
  assert.ok(pairInfo.normalized_pair.endsWith('_EOS'));
  assert.equal(pairInfo.quote_precision, EOS_QUANTITY_PRECISION);

  // const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(pairInfo, price, quantity, sell);

  const orderId = createOrderId();

  const baseQuantity = new BigNumber(quantity)
    .times(10 ** pairInfo.base_precision)
    .integerValue(BigNumber.ROUND_FLOOR)
    .toString();
  const quoteQuantity = numberToString(
    parseFloat(price) * parseFloat(quantity),
    pairInfo.quote_precision,
    !sell,
  );
  const quoteQuantityStr = new BigNumber(quoteQuantity)
    .times(10 ** pairInfo.quote_precision)
    .integerValue(sell ? BigNumber.ROUND_FLOOR : BigNumber.ROUND_CEIL)
    .toString();

  const memo = `order:${USER_CONFIG.eosAccount} | ${
    sell ? 'sell' : 'buy'
  } | limit | ${pairInfo.base_contract!} | ${
    pairInfo.baseCurrency
  } | ${baseQuantity} | eosio.token | EOS | ${quoteQuantityStr} | 10 | 10 | whaleexchang | ${orderId} | ${Math.floor(
    Date.now() / 1000,
  )} | | ${price} | coinrace.com:`;

  const action = sell
    ? createTransferAction(
        USER_CONFIG.eosAccount!,
        'whaleextrust',
        pairInfo.baseCurrency,
        quantity,
        memo,
      )
    : createTransferAction(USER_CONFIG.eosAccount!, 'whaleextrust', 'EOS', quoteQuantity, memo);

  const actionExt: ActionExtended = {
    exchange: 'WhaleEx',
    action,
    orderId: orderId.replace(' ', ''),
  };
  return actionExt;
}
