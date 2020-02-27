import { queryAllBalances } from '../../src/exchanges/bitstamp';
import { init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test('queryAllBalances(Bitstamp)', async () => {
  const balances = await queryAllBalances();
  const symbols = ['BCH', 'BTC', 'ETH', 'LTC', 'XRP'];

  symbols.forEach(symbol => {
    expect(balances).toHaveProperty(symbol);
  });
});
