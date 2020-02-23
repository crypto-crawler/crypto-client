import { init, withdraw } from '../../src/index';
import readUserConfig from '../user_config';

const USER_CONFIG = readUserConfig();

beforeAll(async () => {
  await init(USER_CONFIG);
});

test('withdraw(EOS)', async () => {
  const withdrawalId = await withdraw(
    'Bitfinex',
    'EOS',
    USER_CONFIG.eosAccount!,
    2.6666666666666666666666,
    'Bitfinex',
    {
      wallet: 'exchange',
    },
  );
  expect(withdrawalId instanceof Error).toBeFalsy();
});

test('withdraw(USDT on EOS)', async () => {
  const withdrawalId = await withdraw(
    'Bitfinex',
    'USDT',
    USER_CONFIG.eosAccount!,
    6.0,
    'Bitfinex',
    {
      wallet: 'exchange',
    },
  );
  expect(withdrawalId instanceof Error).toBeTruthy();
});
