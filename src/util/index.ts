import { strict as assert } from 'assert';
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

function validatePrecision(number: string, precision: number): boolean {
  if (!number.includes('.')) return false;
  return number.length - 1 - number.indexOf('.') === precision;
}

export function validatePriceQuantity(
  price: string,
  quantity: string,
  pairInfo: PairInfo,
): boolean {
  assert.ok(validatePrecision(price, pairInfo.price_precision));
  assert.ok(validatePrecision(quantity, pairInfo.quantity_precision));
  if (parseFloat(quantity) * parseFloat(price) <= pairInfo.min_order_volume) {
    throw Error(`The trading volume must be greater than ${pairInfo.min_order_volume} EOS`);
  }
  return true;
}
