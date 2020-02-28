import { getWithdrawalFees, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test("getWithdrawalFees('WhaleEx')", async () => {
  const symbols = ['EIDOS', 'EOS', 'MYKEY', 'USDT', 'XXX', 'YAS'];

  const addresses = await getWithdrawalFees('WhaleEx', symbols);

  expect(addresses).toHaveProperty('EIDOS');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('MYKEY');
  expect(addresses).toHaveProperty('USDT');
  expect(addresses).not.toHaveProperty('XXX');
  expect(addresses).toHaveProperty('YAS');
});
