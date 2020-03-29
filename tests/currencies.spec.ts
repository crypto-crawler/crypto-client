import { fetchCurrencies, init } from '../src/index';
import readUserConfig from './user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
});

const TOP_100_SYMBOLS = [
  'BTC',
  'ETH',
  'XRP',
  'BCH',
  'BSV',
  'LTC',
  'USDT',
  'EOS',
  'BNB',
  'XTZ',
  'ADA',
  'LINK',
  'XLM',
  'XMR',
  'TRX',
  'HT',
  'ETC',
  'NEO',
  'DASH',
  'LEO',
  'CRO',
  'ATOM',
  'HEDG',
  'MIOTA',
  'MKR',
  'XEM',
  'ZEC',
  'ONT',
  'USDC',
  'OKB',
  'BAT',
  'VET',
  'DOGE',
  'FTT',
  'QTUM',
  'DCR',
  'LSK',
  'PAX',
  'BTG',
  'ZRX',
  'RVN',
  'ALGO',
  'ICX',
  'MONA',
  'HBAR',
  'OMG',
  'REP',
  'SNX',
  'ZB',
  'BCD',
  'TUSD',
  'WAVES',
  'NANO',
  'HOT',
  'SC',
  'DAI',
  'THETA',
  'NEXO',
  'BTT',
  'ENJ',
  'ZEN',
  'KCS',
  'DGB',
  'VSYS',
  'DGD',
  'BTM',
  'MOF',
  'CKB',
  'KMD',
  'BTS',
  'HC',
  'CENNZ',
  'BCN',
  'MCO',
  'SXP',
  'IOST',
  'STEEM',
  'XVG',
  'ZIL',
  'KNC',
  'ELF',
  'GNT',
  'WAXP',
  'DX',
  'SNT',
  'LUNA',
  'MANA',
  'ARDR',
  'SEELE',
  'XZC',
  'AE',
  'CHZ',
  'ABBC',
  'RLC',
  'NPXS',
  'MAID',
  'MATIC',
  'REN',
  'RIF',
  'STX',
];

test("fetchCurrencies('Binance')", async () => {
  const currencies = await fetchCurrencies('Binance');

  const blacklist = [
    'BSV',
    'HT',
    'LEO',
    'CRO',
    'HEDG',
    'MIOTA',
    'MKR',
    'OKB',
    'MONA',
    'SNX',
    'ZB',
    'DAI',
    'NEXO',
    'KCS',
    'DGB',
    'VSYS',
    'MOF',
    'CKB',
    'CENNZ',
    'BCN',
    'SXP',
    'WAXP',
    'DX',
    'LUNA',
    'SEELE',
    'ABBC',
    'MAID',
    'RIF',
  ];
  const top100Symbols = TOP_100_SYMBOLS.filter((symbol) => !blacklist.includes(symbol));

  top100Symbols.forEach((symbol) => {
    expect(currencies).toHaveProperty(symbol);
  });

  expect(currencies).not.toHaveProperty('XXX');
});

test("fetchCurrencies('Huobi')", async () => {
  const currencies = await fetchCurrencies('Huobi');

  const blacklist = [
    'BCD',
    'BNB',
    'DGB',
    'LEO',
    'HEDG',
    'MIOTA',
    'MKR',
    'OKB',
    'RVN',
    'MONA',
    'HBAR',
    'REP',
    'SNX',
    'ZB',
    'HOT',
    'DAI',
    'ENJ',
    'KCS',
    'MOF',
    'CENNZ',
    'BCN',
    'SXP',
    'DX',
    'LUNA',
    'CHZ',
    'ABBC',
    'RLC',
    'MAID',
    'MATIC',
    'RIF',
    'STX',
  ];
  const top100Symbols = TOP_100_SYMBOLS.filter((symbol) => !blacklist.includes(symbol));

  top100Symbols.forEach((symbol) => {
    expect(currencies).toHaveProperty(symbol);
  });

  expect(currencies).not.toHaveProperty('XXX');
});

test("fetchCurrencies('OKEx_Spot')", async () => {
  const currencies = await fetchCurrencies('OKEx_Spot');

  const blacklist = [
    'ADA',
    'BNB',
    'XMR',
    'HT',
    'HEDG',
    'MIOTA',
    'BAT',
    'VET',
    'FTT',
    'RVN',
    'MONA',
    'REP',
    'SNX',
    'ZB',
    'NEXO',
    'KCS',
    'KMD',
    'BTS',
    'HC',
    'CENNZ',
    'BCN',
    'SXP',
    'STEEM',
    'XVG',
    'ZIL',
    'WAXP',
    'DX',
    'SNT',
    'LUNA',
    'SEELE',
    'XZC',
    'CHZ',
    'ABBC',
    'RLC',
    'NPXS',
    'MAID',
    'MATIC',
    'RIF',
    'STX',
  ];
  const top100Symbols = TOP_100_SYMBOLS.filter((symbol) => !blacklist.includes(symbol));

  top100Symbols.forEach((symbol) => {
    expect(currencies).toHaveProperty(symbol);
  });

  expect(currencies).not.toHaveProperty('XXX');
});
