import { getWithdrawalFees, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test("getWithdrawalFees('Coinbase')", async () => {
  const addresses = await getWithdrawalFees('Coinbase');

  expect(addresses).toHaveProperty('USD');
  expect(addresses).toHaveProperty('EUR');
});
