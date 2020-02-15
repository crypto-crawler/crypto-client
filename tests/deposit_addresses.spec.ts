import each from 'jest-each';
import { getDepositAddresses, init, SupportedExchange } from '../src/index';
import readUserConfig from './user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
  jest.setTimeout(50 * 1000);
});

each(['Binance', 'OKEx_Spot']).test(
  'getDepositAddresses(Binance, OKEx_Spot)',
  async (exchange: SupportedExchange) => {
    const symbols = ['BTC', 'EOS', 'ETH', 'USDT', 'XXX'];

    const addresses = await getDepositAddresses(exchange, symbols);

    /* eslint-disable jest/no-standalone-expect */
    expect(addresses).toHaveProperty('BTC');
    expect(addresses).toHaveProperty('EOS');
    expect(addresses).toHaveProperty('ETH');
    expect(addresses).toHaveProperty('USDT');
    expect(addresses).not.toHaveProperty('XXX');
    /* eslint-enable jest/no-standalone-expect */
  },
);

each(['Bitstamp', 'Coinbase']).test(
  'getDepositAddresses(Bitstamp, Coinbase)',
  async (exchange: SupportedExchange) => {
    const symbols = ['BCH', 'BTC', 'ETH', 'LTC', 'XRP'];

    const addresses = await getDepositAddresses(exchange, symbols);

    symbols.forEach(symbol => {
      expect(addresses).toHaveProperty(symbol); // eslint-disable-line jest/no-standalone-expect
    });
  },
);

each(['Newdex', 'WhaleEx']).test(
  'getDepositAddresses(Newdex, WhaleEx)',
  async (exchange: SupportedExchange) => {
    const symbols = ['EIDOS', 'EOS', 'MYKEY', 'USDT', 'XXX', 'YAS'];

    const addresses = await getDepositAddresses(exchange, symbols);

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

test("getDepositAddresses('Kraken')", async () => {
  const symbols = ['BTC', 'EOS', 'ETH', 'USDT'];

  jest.setTimeout(symbols.length * 4000); // 4 seconds per symbol

  const addresses = await getDepositAddresses('Kraken', symbols);

  symbols.forEach(symbol => {
    expect(addresses).toHaveProperty(symbol);
  });
});
