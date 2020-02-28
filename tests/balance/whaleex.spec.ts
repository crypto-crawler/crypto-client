import { queryAllBalances } from '../../src/exchanges/whaleex';
import { init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test('queryAllBalances(WhaleEx)', async () => {
  const balances = await queryAllBalances();
  const symbols = ['EOS', 'USDT'];

  symbols.forEach(symbol => {
    expect(balances).toHaveProperty(symbol);
  });
});
