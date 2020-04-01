import { queryAllBalances } from '../../src/exchanges/coinbase_pro';
import { init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test('queryAllBalances(Coinbase)', async () => {
  const balances = await queryAllBalances();
  const symbols = ['BTC', 'ETH', 'EOS', 'USD'];

  symbols.forEach((symbol) => {
    expect(balances).toHaveProperty(symbol);
  });
});
