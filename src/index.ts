import { strict as assert } from 'assert';
import fetchMarkets, { Market, MarketType } from 'crypto-markets';
import { isValidPrivate } from 'eosjs-ecc';
import { UserConfig, USER_CONFIG } from './config';
import * as Binance from './exchanges/binance';
import * as Bitfinex from './exchanges/bitfinex';
import * as Bitstamp from './exchanges/bitstamp';
import * as CoinbasePro from './exchanges/coinbase_pro';
import * as Huobi from './exchanges/huobi';
import * as Kraken from './exchanges/kraken';
import * as MXC from './exchanges/mxc';
import * as Newdex from './exchanges/newdex';
import * as OKEx from './exchanges/okex';
import * as WhaleEx from './exchanges/whaleex';
import { ActionExtended } from './pojo';
import { Currency } from './pojo/currency';
import { CurrencyStatus } from './pojo/currency_status';
import { DepositAddress } from './pojo/deposit_address';
import { WithdrawalFee } from './pojo/withdrawal_fee';
import { detectPlatform } from './util';

export { UserConfig } from './config';
export * from './pojo';

export const SUPPORTED_EXCHANGES = [
  'Binance',
  'Bitfinex',
  'Bitstamp',
  'CoinbasePro',
  'Huobi',
  'Kraken',
  'MXC',
  'Newdex',
  'OKEx',
  'WhaleEx',
] as const;
export type SupportedExchange = typeof SUPPORTED_EXCHANGES[number];

// Spot: exchange -> marketType -> pair -> Market
// Other: exchange -> marketType -> rawPair -> Market
const EXCHANGE_MARKET_CACHE: { [key: string]: { [key: string]: { [key: string]: Market } } } = {};

/**
 * Initialize.
 *
 */
export async function init({
  eosAccount = '',
  eosPrivateKey = '',
  ethPrivateKey = '',
  BINANCE_API_KEY = '',
  BINANCE_API_SECRET = '',
  BITFINEX_API_KEY = '',
  BITFINEX_API_SECRET = '',
  BITSTAMP_USER_ID = 0,
  BITSTAMP_API_KEY = '',
  BITSTAMP_API_SECRET = '',
  COINBASE_ACCESS_KEY = '',
  COINBASE_ACCESS_SECRET = '',
  COINBASE_ACCESS_PASSPHRASE = '',
  DFUSE_API_KEY = '',
  HUOBI_ACCESS_KEY = '',
  HUOBI_SECRET_KEY = '',
  HUOBI_ACCOUNT_ID = 0,
  KRAKEN_API_KEY = '',
  KRAKEN_PRIVATE_KEY = '',
  MXC_ACCESS_KEY = '',
  MXC_SECRET_KEY = '',
  OKEX_SPOT_API_KEY = '',
  OKEX_SPOT_API_SECRET = '',
  OKEX_SPOT_API_PASSPHRASE = '',
  OKEX_SPOT_FUND_PASSWORD = '',
  WHALEEX_API_KEY = '',
  WHALEEX_USER_ID = '',
}: UserConfig): Promise<void> {
  if (eosAccount) {
    USER_CONFIG.eosAccount = eosAccount;
    if (!isValidPrivate(eosPrivateKey)) throw Error(`Invalid EOS private key: ${eosPrivateKey}`);
    USER_CONFIG.eosPrivateKey = eosPrivateKey;
  }

  if (DFUSE_API_KEY) {
    USER_CONFIG.DFUSE_API_KEY = DFUSE_API_KEY;
  }

  if (ethPrivateKey) USER_CONFIG.ethPrivateKey = ethPrivateKey;

  if (BINANCE_API_KEY) {
    assert.ok(BINANCE_API_SECRET);
    USER_CONFIG.BINANCE_API_KEY = BINANCE_API_KEY;
    USER_CONFIG.BINANCE_API_SECRET = BINANCE_API_SECRET;
  }
  if (BITFINEX_API_KEY) {
    assert.ok(BITFINEX_API_SECRET);
    USER_CONFIG.BITFINEX_API_KEY = BITFINEX_API_KEY;
    USER_CONFIG.BITFINEX_API_SECRET = BITFINEX_API_SECRET;
  }
  if (BITSTAMP_API_KEY) {
    assert.ok(BITSTAMP_API_SECRET);
    USER_CONFIG.BITSTAMP_API_KEY = BITSTAMP_API_KEY;
    USER_CONFIG.BITSTAMP_API_SECRET = BITSTAMP_API_SECRET;
    USER_CONFIG.BITSTAMP_USER_ID = BITSTAMP_USER_ID;
  }
  if (COINBASE_ACCESS_KEY) {
    assert.ok(COINBASE_ACCESS_SECRET);
    assert.ok(COINBASE_ACCESS_PASSPHRASE);
    USER_CONFIG.COINBASE_ACCESS_KEY = COINBASE_ACCESS_KEY;
    USER_CONFIG.COINBASE_ACCESS_SECRET = COINBASE_ACCESS_SECRET;
    USER_CONFIG.COINBASE_ACCESS_PASSPHRASE = COINBASE_ACCESS_PASSPHRASE;
  }
  if (HUOBI_ACCESS_KEY) {
    assert.ok(HUOBI_SECRET_KEY);
    USER_CONFIG.HUOBI_ACCESS_KEY = HUOBI_ACCESS_KEY;
    USER_CONFIG.HUOBI_SECRET_KEY = HUOBI_SECRET_KEY;
    USER_CONFIG.HUOBI_ACCOUNT_ID =
      HUOBI_ACCOUNT_ID || (await Huobi.queryAccounts()).filter((x) => x.type === 'spot')[0].id;
  }
  if (KRAKEN_API_KEY) {
    assert.ok(KRAKEN_PRIVATE_KEY);
    USER_CONFIG.KRAKEN_API_KEY = KRAKEN_API_KEY;
    USER_CONFIG.KRAKEN_PRIVATE_KEY = KRAKEN_PRIVATE_KEY;
  }
  if (MXC_ACCESS_KEY) {
    assert.ok(MXC_ACCESS_KEY);
    USER_CONFIG.MXC_ACCESS_KEY = MXC_ACCESS_KEY!;
    USER_CONFIG.MXC_SECRET_KEY = MXC_SECRET_KEY!;
  }
  if (OKEX_SPOT_API_KEY) {
    assert.ok(OKEX_SPOT_API_SECRET);
    assert.ok(OKEX_SPOT_API_PASSPHRASE);

    USER_CONFIG.OKEX_SPOT_API_KEY = OKEX_SPOT_API_KEY!;
    USER_CONFIG.OKEX_SPOT_API_SECRET = OKEX_SPOT_API_SECRET!;
    USER_CONFIG.OKEX_SPOT_API_PASSPHRASE = OKEX_SPOT_API_PASSPHRASE!;
    if (OKEX_SPOT_FUND_PASSWORD) USER_CONFIG.OKEX_SPOT_FUND_PASSWORD = OKEX_SPOT_FUND_PASSWORD;
  }
  if (WHALEEX_API_KEY) {
    assert.ok(WHALEEX_USER_ID, 'WHALEEX_USER_ID is empty');
    await WhaleEx.initilize(WHALEEX_API_KEY, WHALEEX_USER_ID);
  }
}

async function getExchangeMarketAndUpdateCache(
  market: { exchange: SupportedExchange; type: MarketType; pair: string; id?: string } | Market,
): Promise<Market | undefined> {
  if (
    !(market.exchange in EXCHANGE_MARKET_CACHE) ||
    !(market.type in EXCHANGE_MARKET_CACHE[market.exchange])
  ) {
    if (!(market.exchange in EXCHANGE_MARKET_CACHE)) EXCHANGE_MARKET_CACHE[market.exchange] = {};
    if (!(market.type in EXCHANGE_MARKET_CACHE[market.exchange]))
      EXCHANGE_MARKET_CACHE[market.exchange][market.type] = {};
  }

  if (!('fees' in market)) {
    const markets = await fetchMarkets(market.exchange, market.type);

    markets.forEach((m) => {
      const key = m.type === 'Spot' ? m.pair : m.id;
      EXCHANGE_MARKET_CACHE[m.exchange][m.type][key] = m;
    });
  } else {
    EXCHANGE_MARKET_CACHE[market.exchange][market.type][
      market.type === 'Spot' ? market.pair : market.id!
    ] = market as Market;
  }

  return EXCHANGE_MARKET_CACHE[market.exchange][market.type][
    market.type === 'Spot' ? market.pair : market.id!
  ];
}

/**
 * Create an Order object but don't sent it.
 *
 * This API is only used in DEX exchanges.
 *
 * @param market The trading market
 * @param price The price
 * @param quantity The quantity
 * @param sell true if sell, otherwise false
 * @returns ActionExtended
 */
export async function createOrder(
  market: { exchange: SupportedExchange; type: MarketType; pair: string; id?: string } | Market,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<ActionExtended> {
  const realMarket = await getExchangeMarketAndUpdateCache(market);
  assert.ok(
    realMarket,
    `Can NOT find market for ${market.exchange} ${market.pair} in ${market.type} type`,
  );

  switch (market.exchange) {
    case 'Newdex':
      return Newdex.createOrder(realMarket!, price, quantity, sell);
    default:
      throw Error(`Unknown exchange: ${market.exchange}`);
  }
}

/**
 * Place an order.
 *
 * @param market The trading market
 * @param price The price
 * @param quantity The quantity
 * @param sell true if sell, otherwise false
 * @returns transaction_id for dex, or order_id for central
 */
export async function placeOrder(
  market: { exchange: SupportedExchange; type: MarketType; pair: string; id?: string } | Market,
  price: number,
  quantity: number,
  sell: boolean,
  clientOrderId?: string,
): Promise<string> {
  const realMarket = await getExchangeMarketAndUpdateCache(market);
  assert.ok(
    realMarket,
    `Can NOT find market for ${market.exchange} ${market.pair} in ${market.type} type`,
  );

  let result: string | Error;
  switch (market.exchange) {
    case 'Binance':
      result = await Binance.placeOrder(realMarket!, price, quantity, sell);
      break;
    case 'Bitfinex':
      result = await Bitfinex.placeOrder(realMarket!, price, quantity, sell, clientOrderId);
      break;
    case 'Bitstamp':
      result = await Bitstamp.placeOrder(realMarket!, price, quantity, sell);
      break;
    case 'CoinbasePro':
      result = await CoinbasePro.placeOrder(realMarket!, price, quantity, sell);
      break;
    case 'Huobi':
      result = await Huobi.placeOrder(realMarket!, price, quantity, sell, clientOrderId);
      break;
    case 'Kraken':
      result = await Kraken.placeOrder(realMarket!, price, quantity, sell, clientOrderId);
      break;
    case 'MXC':
      result = await MXC.placeOrder(realMarket!, price, quantity, sell);
      break;
    case 'Newdex':
      result = await Newdex.placeOrder(realMarket!, price, quantity, sell);
      break;
    case 'OKEx':
      result = await OKEx.placeOrder(realMarket!, price, quantity, sell, clientOrderId);
      break;
    case 'WhaleEx': {
      result = await WhaleEx.placeOrder(realMarket!, price, quantity, sell);
      break;
    }
    default:
      throw Error(`Unknown exchange: ${market.exchange}`);
  }

  if (result instanceof Error) throw result;
  else return result;
}

/**
 * Cancel an order.
 *
 * @param market The trading market
 * @param orderId Order ID
 * @returns boolean if central, transaction_id if dex
 */
export async function cancelOrder(
  market: { exchange: SupportedExchange; type: MarketType; pair: string; id?: string } | Market,
  orderId: string,
): Promise<boolean | string> {
  assert.ok(orderId);

  const realMarket = await getExchangeMarketAndUpdateCache(market);
  assert.ok(
    realMarket,
    `Can NOT find market for ${market.exchange} ${market.pair} in ${market.type} type`,
  );

  switch (market.exchange) {
    case 'Binance':
      return Binance.cancelOrder(realMarket!, orderId);
    case 'Bitfinex':
      return Bitfinex.cancelOrder(orderId);
    case 'Bitstamp':
      return Bitstamp.cancelOrder(orderId);
    case 'CoinbasePro':
      return CoinbasePro.cancelOrder(orderId);
    case 'Huobi':
      return Huobi.cancelOrder(orderId);
    case 'Kraken':
      return Kraken.cancelOrder(orderId);
    case 'MXC':
      return MXC.cancelOrder(realMarket!, orderId);
    case 'Newdex':
      return Newdex.cancelOrder(orderId);
    case 'OKEx':
      return OKEx.cancelOrder(realMarket!, orderId);
    case 'WhaleEx':
      return WhaleEx.cancelOrder(orderId);
    default:
      throw Error(`Unknown exchange: ${market.exchange}`);
  }
}

/**
 * Query an order.
 *
 * @param market The trading market
 * @param orderId Order ID
 * @returns The order information
 */
export async function queryOrder(
  market: { exchange: SupportedExchange; type: MarketType; pair: string; id?: string } | Market,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(orderId);

  const realMarket = await getExchangeMarketAndUpdateCache(market);
  assert.ok(
    realMarket,
    `Can NOT find market for ${market.exchange} ${market.pair} in ${market.type} type`,
  );

  switch (market.exchange) {
    case 'Binance':
      return Binance.queryOrder(realMarket!, orderId);
    case 'Bitfinex':
      return Bitfinex.queryOrder(orderId);
    case 'Bitstamp':
      return Bitstamp.queryOrder(orderId);
    case 'CoinbasePro':
      return CoinbasePro.queryOrder(orderId);
    case 'Huobi':
      return Huobi.queryOrder(orderId);
    case 'Kraken':
      return Kraken.queryOrder(orderId);
    case 'MXC':
      return MXC.queryOrder(realMarket!, orderId);
    case 'Newdex':
      return Newdex.queryOrder(orderId);
    case 'OKEx':
      return OKEx.queryOrder(realMarket!, orderId);
    case 'WhaleEx':
      return WhaleEx.queryOrder(orderId);
    default:
      throw Error(`Unknown exchange: ${market.exchange}`);
  }
}

/**
 * Get all balances of an exchange.
 *
 * @param exchange The exchange name
 * @param all Only used for debugging. False, get only available balances; True, get all including free and locked balances. Default to false.
 */
export async function queryAllBalances(
  exchange: SupportedExchange,
  all = false,
): Promise<{ [key: string]: number }> {
  let result: { [key: string]: number } | Error;
  switch (exchange) {
    case 'Binance':
      result = await Binance.queryAllBalances(all);
      break;
    case 'Bitfinex':
      result = await Bitfinex.queryAllBalances(all);
      break;
    case 'Bitstamp':
      result = await Bitstamp.queryAllBalances(all);
      break;
    case 'CoinbasePro':
      result = await CoinbasePro.queryAllBalances(all);
      break;
    case 'Huobi':
      result = await Huobi.queryAllBalances(all);
      break;
    case 'Kraken':
      result = await Kraken.queryAllBalances();
      break;
    case 'MXC':
      result = await MXC.queryAllBalances(all);
      break;
    case 'Newdex':
      result = await Newdex.queryAllBalances();
      break;
    case 'OKEx':
      result = await OKEx.queryAllBalances(all);
      break;
    case 'WhaleEx':
      result = await WhaleEx.queryAllBalances(all);
      break;
    default:
      throw Error(`Unknown exchange: ${exchange}`);
  }

  if (result instanceof Error) throw result;

  // filter out zero balances
  const resultTmp: { [key: string]: number } = result;
  Object.keys(resultTmp).forEach((symbol) => {
    if (resultTmp[symbol] <= 0) delete resultTmp[symbol];
  });
  return resultTmp;
}

export async function queryBalance(exchange: SupportedExchange, symbol: string): Promise<number> {
  if (exchange === 'Newdex') return Newdex.queryBalance(symbol);

  const balances = await queryAllBalances(exchange);

  return balances[symbol] || 0;
}

/**
 * Get deposit addresses.
 *
 * @param exchangeName The exchange name
 * @params symbols Symbols to retreive
 * @returns symbol->platform->DepositAddress
 */
export async function getDepositAddresses(
  exchange: SupportedExchange,
  symbols: string[],
): Promise<{ [key: string]: { [key: string]: DepositAddress } }> {
  assert.ok(symbols);
  if (symbols.length === 0) return {};

  switch (exchange) {
    case 'Binance':
      return Binance.getDepositAddresses(symbols);
    case 'Bitfinex':
      return Bitfinex.getDepositAddresses(symbols);
    case 'Bitstamp':
      return Bitstamp.getDepositAddresses(symbols);
    case 'CoinbasePro':
      return CoinbasePro.getDepositAddresses(symbols);
    case 'Huobi':
      return Huobi.getDepositAddresses();
    case 'Kraken':
      return Kraken.getDepositAddresses(symbols);
    case 'OKEx':
      return OKEx.getDepositAddresses(symbols);
    case 'Newdex':
      return Newdex.getDepositAddresses(symbols);
    case 'WhaleEx':
      return WhaleEx.getDepositAddresses(symbols);
    default:
      throw Error(`Unsupported exchange: ${exchange}`);
  }
}

/**
 *
 * @param exchangeName The exchange name
 * @params symbols Symbols to retreive
 * @returns symbol->platform -> WithdrawalFee
 */
export async function getWithdrawalFees(
  exchange: SupportedExchange,
  symbols?: string[],
): Promise<{ [key: string]: { [key: string]: WithdrawalFee } }> {
  assert.ok(exchange);
  if (symbols) assert.ok(symbols.length, 'symbols is an empty array');

  switch (exchange) {
    case 'Binance':
      return Binance.getWithdrawalFees();
    case 'Bitfinex':
      return Bitfinex.getWithdrawalFees();
    case 'Bitstamp':
      return Bitstamp.getWithdrawalFees();
    case 'CoinbasePro':
      return CoinbasePro.getWithdrawalFees();
    case 'Huobi':
      return Huobi.getWithdrawalFees();
    case 'Kraken':
      return Kraken.getWithdrawalFees();
    case 'Newdex': {
      if (symbols === undefined || symbols.length <= 0)
        throw Error(`${exchange} requires an array of symbols`);
      return Newdex.getWithdrawalFees(symbols);
    }
    case 'OKEx':
      return OKEx.getWithdrawalFees();
    case 'WhaleEx': {
      if (symbols === undefined || symbols.length <= 0)
        throw Error(`${exchange} requires an array of symbols`);
      return WhaleEx.getWithdrawalFees(symbols);
    }
    default:
      throw Error(`Unsupported exchange: ${exchange}`);
  }
}

/**
 * Fetch deposit and withdrawal statuses.
 *
 * Similar to fetchCurrencies() of ccxt.
 *
 * @param exchange The exchange name
 * @returns symbol -> chain -> SymbolStatus or symbol -> SymbolStatus
 */
export async function fetchCurrencies(
  exchange: SupportedExchange,
): Promise<{ [key: string]: Currency }> {
  assert.ok(exchange);

  switch (exchange) {
    case 'Binance':
      return Binance.fetchCurrencies();
    case 'Huobi':
      return Huobi.fetchCurrencies();
    case 'OKEx':
      return OKEx.fetchCurrencies();
    default:
      throw Error(`Unsupported exchange: ${exchange}`);
  }
}

export async function fetchCurrencyStatuses(
  exchange: SupportedExchange,
): Promise<{ [key: string]: CurrencyStatus }> {
  assert.ok(exchange);

  switch (exchange) {
    case 'Binance':
      return Binance.fetchCurrencyStatuses();
    case 'Huobi':
      return Huobi.fetchCurrencyStatuses();
    case 'OKEx':
      return OKEx.fetchCurrencyStatuses();
    default:
      throw Error(`Unsupported exchange: ${exchange}`);
  }
}

/**
 * Withdraw.
 *
 * @param exchange The exchange name
 * @param symbol The currency symbol
 * @param address Destination address
 * @param amount Withdrawal amount
 * @param memo Optional, some currencies like EOS require addtional memo
 * @param params Additional parameters, each exchange is different
 * @returns Withdrawal ID
 */
export async function withdraw(
  exchange: SupportedExchange,
  symbol: string,
  address: string,
  amount: number,
  memo?: string,
  params: { [key: string]: string | number | boolean } = {},
): Promise<string> {
  assert.ok(exchange);

  const platform = detectPlatform(address, symbol);
  if (platform === undefined)
    throw new Error(`Failed to detect platform for address ${address} of ${symbol}`);

  const symbolsRequirePlatform = ['USDT'];
  if (symbolsRequirePlatform.includes(symbol) && !platform) {
    throw new Error(`Failed to detect platform of ${symbol}`);
  }

  const symbolsRequireMemoList = ['ATOM', 'EOS', 'XLM', 'XRP'];
  if (!memo) {
    if (symbolsRequireMemoList.includes(symbol)) throw new Error(`${symbol} requires memo`);
    if (symbolsRequireMemoList.includes(platform!))
      throw new Error(`${symbol} on ${platform} requires memo`);
  }

  let result: string | Error;
  switch (exchange) {
    case 'Binance':
      result = await Binance.withdraw(symbol, address, amount, platform, memo);
      break;
    case 'Bitfinex':
      result = await Bitfinex.withdraw(symbol, address, amount, platform, memo, params);
      break;
    case 'Bitstamp':
      result = await Bitstamp.withdraw(symbol, address, amount, memo);
      break;
    case 'CoinbasePro':
      result = await CoinbasePro.withdraw(symbol, address, amount, memo);
      break;
    case 'Huobi':
      result = await Huobi.withdraw(symbol, address, amount, platform, memo);
      break;
    case 'Kraken': {
      if (params.key === undefined) {
        throw new Error('Kraken withdraw requires a key');
      }
      result = await Kraken.withdraw(symbol, platform, params.key as string, amount);
      break;
    }
    case 'MXC':
      throw Error(`MXC does NOT have withdraw API`);
    case 'Newdex':
      result = await Newdex.withdraw(symbol, address, amount, platform, memo!);
      break;
    case 'OKEx':
      result = await OKEx.withdraw(symbol, address, amount, platform, memo);
      break;
    case 'WhaleEx':
      throw Error(`WhaleEx does NOT have withdraw API`);
    default:
      throw Error(`Unsupported exchange: ${exchange}`);
  }

  if (result instanceof Error) throw result;
  else return result;
}
