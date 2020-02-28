/* eslint-disable jest/no-disabled-tests */
import { init, withdraw } from '../../src/index';
import readUserConfig from '../user_config';

const USER_CONFIG = readUserConfig();

beforeAll(async () => {
  await init(USER_CONFIG);
});

test('withdraw(EOS)', async () => {
  const withdrawalId = await withdraw(
    'Binance',
    'EOS',
    USER_CONFIG.eosAccount!,
    2.6666666666666666666666,
    'Binance',
    {
      wallet: 'exchange',
    },
  ).catch((e: Error) => {
    return e;
  });
  expect(withdrawalId instanceof Error).toBeFalsy();
  expect((withdrawalId as string).length).toBeGreaterThan(0);
});
