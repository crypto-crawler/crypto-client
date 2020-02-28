/* eslint-disable jest/no-disabled-tests */
import { init, withdraw } from '../../src/index';
import readUserConfig from '../user_config';

const USER_CONFIG = readUserConfig();

beforeAll(async () => {
  await init(USER_CONFIG);
  jest.setTimeout(20 * 1000);
});

test('withdraw(EOS)', async () => {
  const withdrawalId = await withdraw('Newdex', 'EOS', 'whaleextrust', 0.0001, 'Newdex').catch(
    (e: Error) => {
      return e;
    },
  );
  expect(withdrawalId instanceof Error).toBeFalsy();
  expect((withdrawalId as string).length).toBeGreaterThan(0);
});
