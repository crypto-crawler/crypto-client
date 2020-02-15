import each from 'jest-each';
import { getWithdrawalFees, init, SupportedExchange } from '../src/index';
import readUserConfig from './user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

each(['Binance', 'Bitfinex', 'OKEx_Spot']).test(
  'getWithdrawalFees(Binance, Bitfinex, OKEx_Spot)',
  async (exchange: SupportedExchange) => {
    const symbols = ['BTC', 'EOS', 'ETH', 'XXX'];

    const addresses = await getWithdrawalFees(exchange, symbols);

    /* eslint-disable jest/no-standalone-expect */
    expect(addresses).toHaveProperty('BTC');
    expect(addresses).toHaveProperty('EOS');
    expect(addresses).toHaveProperty('ETH');
    // expect(addresses).toHaveProperty('USDT'); // TODO: add USDT for Bitfinex
    expect(addresses).not.toHaveProperty('XXX');
    /* eslint-enable jest/no-standalone-expect */
  },
);

test("getWithdrawalFees('Bitstamp')", async () => {
  const symbols = ['BCH', 'BTC', 'ETH', 'LTC', 'XRP'];

  const addresses = await getWithdrawalFees('Bitstamp', symbols);

  symbols.forEach(symbol => {
    expect(addresses).toHaveProperty(symbol);
  });
});

test("getWithdrawalFees('Coinbase')", async () => {
  const symbols = ['BCH', 'BTC', 'ETH', 'LTC', 'XRP', 'USD', 'EUR'];

  const addresses = await getWithdrawalFees('Coinbase', symbols);

  symbols.forEach(symbol => {
    expect(addresses).toHaveProperty(symbol);
  });
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
