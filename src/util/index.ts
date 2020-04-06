import { strict as assert } from 'assert';
import BigNumber from 'bignumber.js';
import bs58 from 'bs58';
import { Market } from 'crypto-markets';
import Web3Utils from 'web3-utils';
import { DepositAddress } from '../pojo';

export const FIAT_SYMBOLS = ['CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'USD'];

export type AsyncFunc = (...args: any[]) => Promise<any>;

export async function sleep(ms: number): Promise<any> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* eslint-disable @typescript-eslint/explicit-function-return-type */

// See https://stackoverflow.com/a/29837695/381712
// Decorator for function is not supported in TypeScript,
// see https://github.com/microsoft/TypeScript/issues/7318
export function Retry(times = 1, logger: any = console) {
  assert.ok(times > 0);
  // eslint-disable-next-line func-names
  return function (
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore: its value is never read
    target: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore: its value is never read
    propertyName: string,
    propertyDesciptor: TypedPropertyDescriptor<AsyncFunc>,
  ): TypedPropertyDescriptor<AsyncFunc> {
    const originalMethod = propertyDesciptor.value!;
    // eslint-disable-next-line no-param-reassign,func-names
    propertyDesciptor.value = async function (...args: any[]) {
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
  times = 1,
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

export function numberToString(n: number, decimal: number, ceil = false): string {
  const rounded = new BigNumber(n)
    .times(new BigNumber(10).pow(decimal + 1))
    .integerValue()
    .div(10);
  const restored = ceil
    ? rounded.integerValue(BigNumber.ROUND_CEIL)
    : rounded.integerValue(BigNumber.ROUND_DOWN);
  return restored.div(new BigNumber(10).pow(decimal)).toNumber().toFixed(decimal);
}

export function validatePriceQuantity(market: Market, price: string, quantity: string): boolean {
  assert.equal(
    calcPrecision(price),
    market.precision.price,
    `${market.exchange} ${market.pair} precision.price doesn't match`,
  );
  assert.equal(
    calcPrecision(quantity),
    market.precision.base,
    `${market.exchange} ${market.pair} precision.base doesn't match`,
  );

  // At least one of them exist
  assert.ok(market.minQuantity.base || market.minQuantity.quote);

  if (market.minQuantity.base && parseFloat(quantity) < market.minQuantity.base!) {
    throw Error(
      `The base quantity ${quantity} is less than minQuantity.base ${market.minQuantity.base!} ${
        market.base
      }`,
    );
  }

  const quoteQuantity = parseFloat(price) * parseFloat(quantity);
  if (market.minQuantity.quote && quoteQuantity <= market.minQuantity.quote!) {
    throw Error(
      `The order volume ${quoteQuantity} is less than minQuantity.quote ${market.minQuantity
        .quote!} ${market.quote}`,
    );
  }

  return true;
}

export function convertPriceAndQuantityToStrings(
  market: Market,
  price: number,
  quantity: number,
  sell: boolean,
): [string, string] {
  const priceStr = numberToString(price, market.precision.price, !sell);
  const quantityStr = numberToString(quantity, market.precision.base, false);

  assert.ok(validatePriceQuantity(market, priceStr, quantityStr));

  return [priceStr, quantityStr];
}

export function calcTokenPlatform(depositAddresses: {
  [key: string]: { [key: string]: DepositAddress };
}): { [key: string]: string } {
  const result: { [key: string]: string } = {};
  Object.keys(depositAddresses).forEach((symbol) => {
    const platforms = Object.keys(depositAddresses[symbol]);
    assert.equal(platforms.length, 1);
    result[symbol] = platforms[0]; // eslint-disable-line prefer-destructuring
  });

  return result;
}

export function detectPlatformFromAddress(address: string): string | undefined {
  if (address.indexOf('bc1') === 0) return 'BTC';

  try {
    const hexString = bs58.decode(address).toString('hex');
    if (hexString.length === 50) {
      const prefixPlatformMap: { [key: string]: string } = {
        '00': 'OMNI',
        '05': 'OMNI',
        '1e': 'DOGE',
        '21': 'ELA',
        '24': 'GRS',
        '30': 'LTC',
        '38': 'PAI',
        '3c': 'KMD',
        '41': 'TRC20',
        '3a': 'QTUM',
        '17': 'NEP5',
        '49': 'WICC',
        '4c': 'DASH',
        '52': 'XZC',
        '7c': 'XRP',
      };
      const prefix = hexString.slice(0, 2);
      if (prefix in prefixPlatformMap) return prefixPlatformMap[prefix];
    } else if (hexString.length === 52) {
      const prefixPlatformMap: { [key: string]: string } = {
        '01': 'WAVES',
        '05': 'VSYS',
        '07': 'DCR',
        '09': 'HC',
        '1c': 'ZEC',
        '19': 'NRC20',
        '20': 'ZEN',
      };
      const prefix = hexString.slice(0, 2);
      if (prefix in prefixPlatformMap) return prefixPlatformMap[prefix];
    } else if (hexString.length === 54) {
      const prefixPlatformMap: { [key: string]: string } = {
        '06': 'XTZ',
        '9e': 'NULS',
      };
      const prefix = hexString.slice(0, 2);
      if (prefix in prefixPlatformMap) return prefixPlatformMap[prefix];

      if (hexString.indexOf('06') === 0) {
        return 'XTZ';
      }
    } else if (hexString.length === 58) {
      if (hexString.indexOf('08') === 0) {
        return 'NEW';
      }
    } else if (hexString.length === 60) {
      if (hexString.indexOf('01') === 0) {
        return 'XEM';
      }
    } else if (hexString.length === 140) {
      if (hexString.indexOf('02') === 0) {
        return 'XMR';
      }
    } else if (hexString.length === 144) {
      if (hexString.indexOf('2c') === 0) {
        return 'ETN';
      }
    } else if (hexString.length === 152) {
      if (hexString.indexOf('82') === 0) {
        return 'ADA';
      }
    }
  } catch (e) {
    // do nothing;
  }

  if (Web3Utils.isAddress(address)) return 'ERC20';

  if (address.indexOf('cosmos') === 0) return 'ATOM';
  if (address.indexOf('bnb') === 0) return 'BEP2';
  if (address.indexOf('zil') === 0) return 'ZIL';
  if (address.indexOf('hx') === 0) return 'ICX';
  if (address.indexOf('bm') === 0) return 'BTM';
  if (address.indexOf('ACT') === 0) return 'ACT';
  if (address.indexOf('ckb') === 0) return 'CKB';
  if (address.indexOf('ak_') === 0) return 'AE';
  if (address.indexOf('nano_') === 0) return 'NANO';
  if (/^[0-9]{1,20}L$/.test(address)) return 'LSK';
  if (/^[0-9a-f]{76}$/.test(address)) return 'SC';

  // https://github.com/EOSIO/eos/issues/955
  if (/(^[a-z1-5.]{1,11}[a-z1-5]$)|(^[a-z1-5.]{12}[a-j1-5]$)/.test(address)) return 'EOS';

  return undefined;
}

export function detectPlatform(address: string, symbol: string): string | undefined {
  const platform = detectPlatformFromAddress(address);

  if (platform === 'OMNI') return ['BTC', 'BCH', 'BSV', 'BHD'].includes(symbol) ? symbol : platform;
  if (platform === 'ERC20') return ['ETH', 'ETC'].includes(symbol) ? symbol : platform;
  if (platform === 'TRC20' && symbol === 'TRX') return 'TRX';
  if (platform === 'NRC20' && symbol === 'NAS') return 'NAS';
  if (platform === 'EOS' && symbol === 'EOS') return 'EOS';
  if (platform === 'BEP2' && symbol === 'BNB') return 'BNB';
  if (platform === 'NEP5' && symbol === 'NEO') return 'NEO';
  if (platform === 'DOGE') return ['DOGE', 'XVG'].includes(symbol) ? symbol : platform;

  return platform;
}
