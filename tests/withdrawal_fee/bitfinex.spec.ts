import { getWithdrawalFees, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
  jest.setTimeout(90 * 1000);
});

test("getWithdrawalFees('Bitfinex')", async () => {
  const addresses = await getWithdrawalFees('Bitfinex');

  expect(addresses).toHaveProperty('BTC');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('ETH');
  // expect(addresses).toHaveProperty('USDT'); // TODO: add USDT for Bitfinex
  expect(addresses).not.toHaveProperty('XXX');
});
