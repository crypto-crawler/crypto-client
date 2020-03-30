import { getWithdrawalFees, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test("getWithdrawalFees('CoinbasePro')", async () => {
  const addresses = await getWithdrawalFees('CoinbasePro');

  expect(addresses).toHaveProperty('USD');
  expect(addresses).toHaveProperty('EUR');
});
