import { getDepositAddresses, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test("getDepositAddresses('Bitstamp')", async () => {
  const symbols = ['BCH', 'BTC', 'ETH', 'LTC', 'XRP'];

  const addresses = await getDepositAddresses('Bitstamp', symbols);

  symbols.forEach(symbol => {
    expect(addresses).toHaveProperty(symbol);
  });
});
