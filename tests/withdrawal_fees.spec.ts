import each from 'jest-each';
import { getWithdrawalFees, init, SupportedExchange } from '../src/index';
import readUserConfig from './user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
  jest.setTimeout(90 * 1000);
});

test("getWithdrawalFees('Binance')", async () => {
  const addresses = await getWithdrawalFees('Binance');

  /* eslint-disable jest/no-standalone-expect */
  expect(addresses).toHaveProperty('BTC');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('ETH');
  expect(addresses).toHaveProperty('USDT');
  expect(addresses).toHaveProperty('BNB');
  expect(addresses).not.toHaveProperty('XXX');

  if (addresses.GTO) {
    expect(addresses.GTO).toHaveProperty('BEP2');
  }
  if (addresses.MITH) {
    expect(addresses.MITH).toHaveProperty('BEP2');
  }
  if (addresses.ONE) {
    expect(addresses.ONE).toHaveProperty('BEP2');
  }
  /* eslint-enable jest/no-standalone-expect */
});

test("getWithdrawalFees('Bitfinex')", async () => {
  const addresses = await getWithdrawalFees('Bitfinex');

  /* eslint-disable jest/no-standalone-expect */
  expect(addresses).toHaveProperty('BTC');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('ETH');
  // expect(addresses).toHaveProperty('USDT'); // TODO: add USDT for Bitfinex
  expect(addresses).not.toHaveProperty('XXX');
  /* eslint-enable jest/no-standalone-expect */
});

test("getWithdrawalFees('Bitstamp')", async () => {
  const symbols = ['BCH', 'BTC', 'ETH', 'LTC', 'XRP'];

  const addresses = await getWithdrawalFees('Bitstamp');

  symbols.forEach(symbol => {
    expect(addresses).toHaveProperty(symbol);
  });
});

test("getWithdrawalFees('Coinbase')", async () => {
  const addresses = await getWithdrawalFees('Coinbase');

  expect(addresses).toHaveProperty('USD');
  expect(addresses).toHaveProperty('EUR');
});

test("getWithdrawalFees('Huobi')", async () => {
  const addresses = await getWithdrawalFees('Huobi');

  /* eslint-disable jest/no-standalone-expect */
  expect(addresses).toHaveProperty('BTC');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('ETH');
  expect(addresses).toHaveProperty('USDT');
  expect(addresses).not.toHaveProperty('XXX');

  if (addresses.AAC) {
    expect(addresses.AAC).toHaveProperty('ERC20');
  }
  if (addresses.ITC) {
    expect(addresses.ITC).toHaveProperty('ERC20');
  }
  if (addresses.ONE) {
    expect(addresses.ONE).toHaveProperty('ERC20');
  }
  /* eslint-enable jest/no-standalone-expect */
});

test("getWithdrawalFees('OKEx_Spot')", async () => {
  const addresses = await getWithdrawalFees('OKEx_Spot');

  /* eslint-disable jest/no-standalone-expect */
  expect(addresses).toHaveProperty('BTC');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('ETH');
  expect(addresses).toHaveProperty('USDT');
  expect(addresses).toHaveProperty('OKB');
  expect(addresses).not.toHaveProperty('XXX');

  if (addresses.AAC) {
    expect(addresses.AAC).toHaveProperty('AAC');
  }
  if (addresses.ITC) {
    expect(addresses.ITC).toHaveProperty('ITC');
  }
  if (addresses.MITH) {
    expect(addresses.MITH).toHaveProperty('ERC20');
  }
  /* eslint-enable jest/no-standalone-expect */
});

each(['Newdex', 'WhaleEx']).test(
  'getWithdrawalFees(Newdex, WhaleEx)',
  async (exchange: SupportedExchange) => {
    const symbols = ['EIDOS', 'EOS', 'MYKEY', 'USDT', 'XXX', 'YAS'];

    const addresses = await getWithdrawalFees(exchange, symbols);

    /* eslint-disable jest/no-standalone-expect */
    expect(addresses).toHaveProperty('EIDOS');
    expect(addresses).toHaveProperty('EOS');
    expect(addresses).toHaveProperty('MYKEY');
    expect(addresses).toHaveProperty('USDT');
    expect(addresses).not.toHaveProperty('XXX');
    expect(addresses).toHaveProperty('YAS');
    /* eslint-enable jest/no-standalone-expect */
  },
);
