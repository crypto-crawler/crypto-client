import { queryAllBalances } from '../../src/exchanges/newdex';
import { init } from '../../src/index';
import readUserConfig from '../user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

test('queryAllBalances(Newdex)', async () => {
  const balances = await queryAllBalances();
  const symbols = ['EOS', 'USDT'];

  symbols.forEach((symbol) => {
    expect(balances).toHaveProperty(symbol);
  });
});
