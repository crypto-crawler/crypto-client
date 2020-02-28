import { getDepositAddresses, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test("getDepositAddresses('Kraken')", async () => {
  const symbols = ['BTC', 'EOS', 'ETH', 'USDT'];

  jest.setTimeout(symbols.length * 4000); // 4 seconds per symbol

  const addresses = await getDepositAddresses('Kraken', symbols);

  symbols.forEach(symbol => {
    expect(addresses).toHaveProperty(symbol);
  });
});
