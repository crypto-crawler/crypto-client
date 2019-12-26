import { strict as assert } from 'assert';
import BigNumber from 'bignumber.js';
import { PairInfo } from 'exchange-info';
import { getTokenInfo } from 'eos-token-info';

export type AsyncFunc = (...args: any[]) => Promise<any>;

// See https://stackoverflow.com/a/29837695/381712
// Decorator for function is not supported in TypeScript,
// see https://github.com/microsoft/TypeScript/issues/7318
export function Retry(times: number = 1, logger: any = console) {
  assert.ok(times > 0);
  // eslint-disable-next-line func-names
  return function(
    // @ts-ignore: its value is never read
    target: Object,
    // @ts-ignore: its value is never read
    propertyName: string,
    propertyDesciptor: TypedPropertyDescriptor<AsyncFunc>,
  ): TypedPropertyDescriptor<AsyncFunc> {
    const originalMethod = propertyDesciptor.value!;
    // eslint-disable-next-line no-param-reassign,func-names
    propertyDesciptor.value = async function(...args: any[]) {
      let error = new Error();
      try {
        for (let i = 0; i < times; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          return await originalMethod.apply(this, args);
        }
      } catch (e) {
        error = e;
        logger.error(e);
      }
      throw error;
    };
    return propertyDesciptor;
  };
}

export async function retry(
  func: (...args: any[]) => Promise<any>,
  times: number = 1,
  logger: any = console,
  ...args: any[]
) {
  assert.ok(times > 0);
  let error = new Error();
  try {
    for (let i = 0; i < times; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      return await func(args);
    }
  } catch (e) {
    error = e;
    logger.error(e);
  }
  throw error;
}

export function calcPrecision(numberStr: string): number {
  if (!numberStr.includes('.')) return 0;
  return numberStr.length - numberStr.indexOf('.') - 1;
}

export function numberToString(n: number, decimal: number, ceil: boolean = false): string {
  const rounded = new BigNumber(n)
    .times(new BigNumber(10).pow(decimal + 1))
    .integerValue()
    .div(10);
  const restored = ceil
    ? rounded.integerValue(BigNumber.ROUND_CEIL)
    : rounded.integerValue(BigNumber.ROUND_DOWN);
  return restored
    .div(new BigNumber(10).pow(decimal))
    .toNumber()
    .toFixed(decimal);
}

export function validatePriceQuantity(
  pairInfo: PairInfo,
  price: string,
  quantity: string,
  quoteQuantity: string,
): boolean {
  if (pairInfo.normalized_pair.endsWith('_EOS')) {
    const baseTokenInfo = getTokenInfo(pairInfo.normalized_pair.split('_')[0]);
    const quoteTokenInfo = getTokenInfo(pairInfo.normalized_pair.split('_')[1]);
    assert.equal(calcPrecision(quantity), baseTokenInfo.decimals);
    assert.equal(calcPrecision(quoteQuantity), quoteTokenInfo.decimals);
  }

  assert.equal(calcPrecision(price), pairInfo.price_precision, "price_precision doesn't match");
  assert.equal(calcPrecision(quantity), pairInfo.base_precision, "base_precision doesn't match");
  assert.equal(
    calcPrecision(quoteQuantity),
    pairInfo.quote_precision,
    "quote_precision doesn't match",
  );
  if (parseFloat(quoteQuantity) <= pairInfo.min_quote_quantity) {
    throw Error(
      `The order volume ${quoteQuantity} is less than min_quote_quantity ${
        pairInfo.min_quote_quantity
      } ${pairInfo.normalized_pair.split('_')[1]}`,
    );
  }
  if (pairInfo.min_base_quantity && parseFloat(quantity) < pairInfo.min_base_quantity) {
    throw Error(
      `The base quantity ${quantity} is less than min_base_quantity ${pairInfo.min_base_quantity} ${
        pairInfo.normalized_pair.split('_')[0]
      }`,
    );
  }
  return true;
}

export function convertPriceAndQuantityToStrings(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
): [string, string, string] {
  const priceStr = numberToString(price, pairInfo.price_precision, !sell);
  const quantityStr = numberToString(quantity, pairInfo.base_precision, false);
  const quoteQuantity = numberToString(
    parseFloat(priceStr) * parseFloat(quantityStr),
    pairInfo.quote_precision,
    !sell,
  );

  assert.ok(validatePriceQuantity(pairInfo, priceStr, quantityStr, quoteQuantity));

  return [priceStr, quantityStr, quoteQuantity];
}
