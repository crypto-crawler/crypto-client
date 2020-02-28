import { getDepositAddresses, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test("getDepositAddresses('WhaleEx')", async () => {
  const symbols = ['EIDOS', 'EOS', 'MYKEY', 'USDT', 'XXX', 'YAS'];

  const addresses = await getDepositAddresses('WhaleEx', symbols);

  expect(addresses).toHaveProperty('EIDOS');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('MYKEY');
  expect(addresses).toHaveProperty('USDT');
  expect(addresses).not.toHaveProperty('XXX');
  expect(addresses).toHaveProperty('YAS');
});
