import { getWithdrawalFees, init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test("getWithdrawalFees('Huobi')", async () => {
  const addresses = await getWithdrawalFees('Huobi');

  expect(addresses).toHaveProperty('BTC');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('ETH');
  expect(addresses).toHaveProperty('USDT');
  expect(addresses).not.toHaveProperty('XXX');

  if (addresses.AAC) {
    expect(addresses.AAC).toHaveProperty('ERC20');
  }
  if (addresses.ITC) {
    expect(addresses.ITC).toHaveProperty('ERC20');
  }
  if (addresses.ONE) {
    expect(addresses.ONE).toHaveProperty('ERC20');
  }
});
