import { getDepositAddresses, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
  jest.setTimeout(30 * 1000); // 30 seconds
});

test("getDepositAddresses('CoinbasePro')", async () => {
  const symbols = ['BCH', 'BTC', 'ETH', 'LTC', 'XRP']; // TODO: EOS, Internal server error

  const addresses = await getDepositAddresses('CoinbasePro', symbols);

  symbols.forEach((symbol) => {
    expect(addresses).toHaveProperty(symbol);
  });
});
