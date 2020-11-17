/* eslint-disable jest/no-conditional-expect */
import { getWithdrawalFees, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
  jest.setTimeout(40 * 1000);
});

test("getWithdrawalFees('Binance')", async () => {
  const addresses = await getWithdrawalFees('Binance');

  expect(addresses).toHaveProperty('BTC');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('ETH');
  expect(addresses).toHaveProperty('USDT');
  expect(addresses).toHaveProperty('BNB');
  expect(addresses).not.toHaveProperty('XXX');

  if (addresses.GTO) {
    expect(addresses.GTO).toHaveProperty('BEP2');
  }
  if (addresses.MITH) {
    expect(addresses.MITH).toHaveProperty('BEP2');
  }
  if (addresses.ONE) {
    expect(addresses.ONE).toHaveProperty('ONE');
  }
});
