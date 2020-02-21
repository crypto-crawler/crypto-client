import each from 'jest-each';
import { getWithdrawalFees, init, SupportedExchange } from '../src/index';
import readUserConfig from './user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
  jest.setTimeout(90 * 1000);
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
