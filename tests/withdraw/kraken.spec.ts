/* eslint-disable jest/no-disabled-tests */
import { init, withdraw } from '../../src/index';
import readUserConfig from '../user_config';

const USER_CONFIG = readUserConfig();

beforeAll(async () => {
  await init(USER_CONFIG);
});

test('withdraw(EOS)', async () => {
  const withdrawalId = await withdraw('Kraken', 'EOS', 'xxx', 0.5, 'yyy', {
    key: USER_CONFIG.eosAccount!,
  }).catch((e: Error) => {
    return e;
  });
  expect(withdrawalId instanceof Error).toBeFalsy();
  expect((withdrawalId as string).length).toBeGreaterThan(0);
});
