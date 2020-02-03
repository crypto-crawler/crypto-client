import { init, queryAllBalances } from '../src/index';
import readUserConfig from './user_config';

beforeAll(async () => {
  jest.setTimeout(20000); // 20 seconds
  const userConfig = readUserConfig();
  await init(userConfig);
});

test('queryAllBalances()', async () => {
  await queryAllBalances('Binance');
  await queryAllBalances('Bitfinex');
  await queryAllBalances('Bitstamp');
  await queryAllBalances('Coinbase');
  await queryAllBalances('Huobi');
  await queryAllBalances('Kraken');
  await queryAllBalances('MXC');
  expect(await queryAllBalances('Newdex')).toHaveProperty('EOS');
  await queryAllBalances('OKEx_Spot');
  await queryAllBalances('WhaleEx');
});
