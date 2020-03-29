import { getDepositAddresses, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test("getDepositAddresses('Binance')", async () => {
  const symbols = ['BTC', 'EOS', 'ETH', 'TRX', 'USDT', 'XXX'];

  const addresses = await getDepositAddresses('Binance', symbols);

  symbols
    .filter((x) => x !== 'XXX')
    .forEach((symbol) => {
      expect(addresses).toHaveProperty(symbol);
    });

  symbols
    .filter((x) => x === 'USDT')
    .forEach((symbol) => {
      expect(addresses[symbol]).toHaveProperty('ERC20');
    });

  expect(addresses).not.toHaveProperty('XXX');
});
