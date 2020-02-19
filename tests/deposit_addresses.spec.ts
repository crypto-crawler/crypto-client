import each from 'jest-each';
import { getDepositAddresses, init, SupportedExchange } from '../src/index';
import readUserConfig from './user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
  jest.setTimeout(50 * 1000);
});

test("getDepositAddresses('Binance')", async () => {
  const symbols = ['BTC', 'EOS', 'ETH', 'TRX', 'USDT', 'XXX'];

  const addresses = await getDepositAddresses('Binance', symbols);

  symbols
    .filter(x => x !== 'XXX')
    .forEach(symbol => {
      expect(addresses).toHaveProperty(symbol);
    });

  symbols
    .filter(x => x === 'USDT')
    .forEach(symbol => {
      expect(addresses[symbol]).toHaveProperty('Ethereum');
    });

  expect(addresses).not.toHaveProperty('XXX');
});

test("getDepositAddresses('Bitstamp')", async () => {
  const symbols = ['BCH', 'BTC', 'ETH', 'LTC', 'XRP'];

  const addresses = await getDepositAddresses('Bitstamp', symbols);

  symbols.forEach(symbol => {
    expect(addresses).toHaveProperty(symbol);
  });
});

test("getDepositAddresses('Coinbase')", async () => {
  const symbols = ['BCH', 'BTC', 'EOS', 'ETH', 'LTC', 'XRP'];

  const addresses = await getDepositAddresses('Coinbase', symbols);

  symbols.forEach(symbol => {
    expect(addresses).toHaveProperty(symbol);
  });
});

test("getDepositAddresses('OKEx_Spot')", async () => {
  const symbols = ['BTC', 'EOS', 'ETH', 'TRX', 'USDT', 'XXX'];

  const addresses = await getDepositAddresses('OKEx_Spot', symbols);

  symbols
    .filter(x => x !== 'XXX')
    .forEach(symbol => {
      expect(addresses).toHaveProperty(symbol);
    });

  symbols
    .filter(x => x === 'USDT')
    .forEach(symbol => {
      expect(addresses[symbol]).toHaveProperty('Omni');
    });

  expect(addresses).not.toHaveProperty('XXX');
});

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
