import { strict as assert } from 'assert';
import BigNumber from 'bignumber.js';
import { PairInfo } from 'exchange-info';

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
  price: string,
  quantity: string,
  pairInfo: PairInfo,
): boolean {
  assert.equal(calcPrecision(price), pairInfo.price_precision, "price_precision doesn't match");
  assert.equal(calcPrecision(quantity), pairInfo.base_precision, "base_precision doesn't match");
  if (parseFloat(quantity) * parseFloat(price) <= pairInfo.min_order_volume) {
    throw Error(
      `The trading volume is less than ${pairInfo.min_order_volume} ${pairInfo.split('_')[1]}`,
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
  const orderVolume = parseFloat(priceStr) * parseFloat(quantityStr);
  if (orderVolume < pairInfo.min_order_volume) {
    throw new Error(
      `Order volume ${orderVolume}  is less than min_order_volume ${pairInfo.min_order_volume} ${
        pairInfo.normalized_pair.split('_')[1]
      }`,
    );
  }

  if (!validatePriceQuantity(priceStr, quantityStr, pairInfo)) {
    throw new Error('Validaton on price and quantity failed');
  }

  return [priceStr, quantityStr, numberToString(orderVolume, pairInfo.quote_precision, true)];
}
