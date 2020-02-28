import { getWithdrawalFees, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test("getWithdrawalFees('Kraken')", async () => {
  const symbols = ['BCH', 'BTC', 'ETH', 'LTC', 'XRP'];

  const addresses = await getWithdrawalFees('Kraken');

  symbols.forEach(symbol => {
    expect(addresses).toHaveProperty(symbol);
  });
});
