import { init, withdraw } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test('withdraw(EOS)', async () => {
  const withdrawalId = await withdraw(
    'Bitfinex',
    'EOS',
    'cryptoforest',
    2.6666666666666666666666,
    'Bitfinex',
    {
      wallet: 'exchange',
    },
  );
  expect(withdrawalId instanceof Error).toBeFalsy();
});

test('withdraw(USDT on EOS)', async () => {
  const withdrawalId = await withdraw('Bitfinex', 'USDT', 'cryptoforest', 6.0, 'Bitfinex', {
    wallet: 'exchange',
  });
  expect(withdrawalId instanceof Error).toBeTruthy();
});
