/* eslint-disable jest/no-disabled-tests */
import { init, withdraw } from '../../src/index';
import readUserConfig from '../user_config';

const USER_CONFIG = readUserConfig();

beforeAll(async () => {
  await init(USER_CONFIG);
});

test('withdraw(EOS) less than 1 EOS', async () => {
  const withdrawalId = await withdraw('Coinbase', 'EOS', 'cryptoforest', 0.99, 'Coinbase').catch(
    (e: Error) => {
      return e;
    },
  );
  expect(withdrawalId instanceof Error).toBeTruthy();
});

// Sending EOS is temporarily disabled.
test('withdraw(EOS)', async () => {
  const withdrawalId = await withdraw('Coinbase', 'EOS', 'cryptoforest', 1.0, 'Coinbase').catch(
    (e: Error) => {
      return e;
    },
  );
  expect(withdrawalId instanceof Error).toBeFalsy();
  expect((withdrawalId as string).length).toBeGreaterThan(0);
});

test('withdraw(ETH)', async () => {
  const withdrawalId = await withdraw(
    'Coinbase',
    'ETH',
    '0xb2dF9816232c6A8D0CB29a10A8E4d19C7ADC6a50',
    0.01,
  ).catch((e: Error) => {
    return e;
  });
  expect(withdrawalId instanceof Error).toBeFalsy();
  expect((withdrawalId as string).length).toBeGreaterThan(0);
});
