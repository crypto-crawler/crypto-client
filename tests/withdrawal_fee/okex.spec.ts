import { getWithdrawalFees, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
  jest.setTimeout(90 * 1000);
});

test("getWithdrawalFees('OKEx_Spot')", async () => {
  const addresses = await getWithdrawalFees('OKEx_Spot');

  expect(addresses).toHaveProperty('BTC');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('ETH');
  expect(addresses).toHaveProperty('USDT');
  expect(addresses).toHaveProperty('OKB');
  expect(addresses).not.toHaveProperty('XXX');

  if (addresses.AAC) {
    expect(addresses.AAC).toHaveProperty('AAC');
  }
  if (addresses.ITC) {
    expect(addresses.ITC).toHaveProperty('ITC');
  }
  if (addresses.MITH) {
    expect(addresses.MITH).toHaveProperty('ERC20');
  }
});
