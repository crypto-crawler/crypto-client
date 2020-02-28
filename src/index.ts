import { strict as assert } from 'assert';
import { isValidPrivate } from 'eosjs-ecc';
import getExchangeInfo, { ExchangeInfo } from 'exchange-info';
import { UserConfig, USER_CONFIG } from './config';
import * as Binance from './exchanges/binance';
import * as Bitfinex from './exchanges/bitfinex';
import * as Bitstamp from './exchanges/bitstamp';
import * as Coinbase from './exchanges/coinbase';
import * as Huobi from './exchanges/huobi';
import * as Kraken from './exchanges/kraken';
import * as MXC from './exchanges/mxc';
import * as Newdex from './exchanges/newdex';
import * as OKEx_Spot from './exchanges/okex_spot';
import * as WhaleEx from './exchanges/whaleex';
import { createOrder as createOrderWhaleEx } from './exchanges/whaleex_eos';
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
  'Coinbase',
  'Huobi',
  'Kraken',
  'MXC',
  'Newdex',
  'OKEx_Spot',
  'WhaleEx',
] as const;
export type SupportedExchange = typeof SUPPORTED_EXCHANGES[number];

const EXCHANGE_INFO_CACHE: { [key: string]: ExchangeInfo } = {};

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
      HUOBI_ACCOUNT_ID || (await Huobi.queryAccounts()).filter(x => x.type === 'spot')[0].id;
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

async function getExchangeInfoAndUpdateCache(
  exchange: string | ExchangeInfo,
): Promise<ExchangeInfo> {
  if (typeof exchange === 'string') {
    if (!(exchange in EXCHANGE_INFO_CACHE)) {
      EXCHANGE_INFO_CACHE[exchange] = await getExchangeInfo(exchange as SupportedExchange, 'Spot');
    }
    return EXCHANGE_INFO_CACHE[exchange];
  }
  if (typeof exchange === 'object') {
    const exchangeInfo = exchange as ExchangeInfo;
    EXCHANGE_INFO_CACHE[exchangeInfo.name] = exchangeInfo;
    return exchangeInfo;
  }
  throw new Error(`Illegal exchange: ${exchange}`);
}

/**
 * Create an Order object but don't sent it.
 *
 * This API is only used in DEX exchanges.
 *
 * @param exchange Dex exchange name
 * @param pair The normalized pair, e.g., EIDOS_EOS
 * @param price The price
 * @param quantity The quantity
 * @param sell true if sell, otherwise false
 * @returns ActionExtended
 */
export async function createOrder(
  exchange: SupportedExchange | ExchangeInfo,
  pair: string,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<ActionExtended> {
  const exchangeInfo = await getExchangeInfoAndUpdateCache(exchange);
  const pairInfo = exchangeInfo.pairs[pair];

  switch (exchange) {
    case 'Newdex':
      return Newdex.createOrder(pairInfo, price, quantity, sell);
    case 'WhaleEx': {
      return createOrderWhaleEx(pairInfo, price, quantity, sell);
    }
    default:
      throw Error(`Unknown exchange: ${exchange}`);
  }
}

/**
 * Place an order.
 *
 * @param exchange  The exchange name
 * @param pair The normalized pair, e.g., EIDOS_EOS
 * @param price The price
 * @param quantity The quantity
 * @param sell true if sell, otherwise false
 * @returns transaction_id for dex, or order_id for central
 */
export async function placeOrder(
  exchange: SupportedExchange | ExchangeInfo,
  pair: string,
  price: number,
  quantity: number,
  sell: boolean,
  clientOrderId?: string,
): Promise<string> {
  const exchangeInfo = await getExchangeInfoAndUpdateCache(exchange);
  assert.ok(exchangeInfo);
  const pairInfo = exchangeInfo.pairs[pair];
  assert.ok(pairInfo, `${exchangeInfo.name} does NOT have pair ${pair}`);

  let result: string | Error;
  switch (exchangeInfo.name) {
    case 'Binance':
      result = await Binance.placeOrder(pairInfo, price, quantity, sell);
      break;
    case 'Bitfinex':
      result = await Bitfinex.placeOrder(pairInfo, price, quantity, sell, clientOrderId);
      break;
    case 'Bitstamp':
      result = await Bitstamp.placeOrder(pairInfo, price, quantity, sell);
      break;
    case 'Coinbase':
      result = await Coinbase.placeOrder(pairInfo, price, quantity, sell);
      break;
    case 'Huobi':
      result = await Huobi.placeOrder(pairInfo, price, quantity, sell, clientOrderId);
      break;
    case 'Kraken':
      result = await Kraken.placeOrder(pairInfo, price, quantity, sell, clientOrderId);
      break;
    case 'MXC':
      result = await MXC.placeOrder(pairInfo, price, quantity, sell);
      break;
    case 'Newdex':
      result = await Newdex.placeOrder(pairInfo, price, quantity, sell);
      break;
    case 'OKEx_Spot':
      result = await OKEx_Spot.placeOrder(pairInfo, price, quantity, sell, clientOrderId);
      break;
    case 'WhaleEx': {
      result = await WhaleEx.placeOrder(pairInfo, price, quantity, sell);
      break;
    }
    default:
      throw Error(`Unknown exchange: ${exchangeInfo.name}`);
  }

  if (result instanceof Error) throw result;
  else return result;
}

/**
 * Cancel an order.
 *
 * @param exchange  The exchange name
 * @param pair The normalized pair, e.g., EIDOS_EOS
 * @param orderId_or_transactionId orderId if central, transactionId if dex
 * @returns boolean if central, transaction_id if dex
 */
export async function cancelOrder(
  exchange: SupportedExchange | ExchangeInfo,
  pair: string,
  orderId_or_transactionId: string,
): Promise<boolean | string> {
  assert.ok(orderId_or_transactionId);

  const exchangeInfo = await getExchangeInfoAndUpdateCache(exchange);
  const pairInfo = exchangeInfo.pairs[pair];

  switch (exchange) {
    case 'Binance':
      return Binance.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'Bitfinex':
      return Bitfinex.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'Bitstamp':
      return Bitstamp.cancelOrder(orderId_or_transactionId);
    case 'Coinbase':
      return Coinbase.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'Huobi':
      return Huobi.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'Kraken':
      return Kraken.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'MXC':
      return MXC.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'Newdex':
      return Newdex.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'OKEx_Spot':
      return OKEx_Spot.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'WhaleEx':
      return WhaleEx.cancelOrder(pairInfo, orderId_or_transactionId);
    default:
      throw Error(`Unknown exchange: ${exchange}`);
  }
}

/**
 * Query an order.
 *
 * @param exchange The exchange name
 * @param pair The normalized pair, e.g., EIDOS_EOS
 * @param orderId Order ID
 * @returns The order information
 */
export async function queryOrder(
  exchange: SupportedExchange | ExchangeInfo,
  pair: string,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(orderId);

  const exchangeInfo = await getExchangeInfoAndUpdateCache(exchange);
  const pairInfo = exchangeInfo.pairs[pair];

  switch (exchange) {
    case 'Binance':
      return Binance.queryOrder(pairInfo, orderId);
    case 'Bitfinex':
      return Bitfinex.queryOrder(pairInfo, orderId);
    case 'Bitstamp':
      return Bitstamp.queryOrder(orderId);
    case 'Coinbase':
      return Coinbase.queryOrder(pairInfo, orderId);
    case 'Huobi':
      return Huobi.queryOrder(pairInfo, orderId);
    case 'Kraken':
      return Kraken.queryOrder(pairInfo, orderId);
    case 'MXC':
      return MXC.queryOrder(pairInfo, orderId);
    case 'Newdex':
      return Newdex.queryOrder(pairInfo, orderId);
    case 'OKEx_Spot':
      return OKEx_Spot.queryOrder(pairInfo, orderId);
    case 'WhaleEx':
      return WhaleEx.queryOrder(pairInfo, orderId);
    default:
      throw Error(`Unknown exchange: ${exchange}`);
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
  all: boolean = false,
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
    case 'Coinbase':
      result = await Coinbase.queryAllBalances(all);
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
    case 'OKEx_Spot':
      result = await OKEx_Spot.queryAllBalances(all);
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
  Object.keys(resultTmp).forEach(symbol => {
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
  exchange: SupportedExchange | ExchangeInfo,
  symbols: string[],
): Promise<{ [key: string]: { [key: string]: DepositAddress } }> {
  assert.ok(symbols);
  if (symbols.length === 0) return {};

  const exchangeInfo = await getExchangeInfoAndUpdateCache(exchange);

  switch (exchangeInfo.name) {
    case 'Binance':
      return Binance.getDepositAddresses(symbols);
    case 'Bitfinex':
      return Bitfinex.getDepositAddresses(symbols);
    case 'Bitstamp':
      return Bitstamp.getDepositAddresses(symbols);
    case 'Coinbase':
      return Coinbase.getDepositAddresses(symbols);
    case 'Huobi':
      return Huobi.getDepositAddresses();
    case 'Kraken':
      return Kraken.getDepositAddresses(symbols);
    case 'OKEx_Spot':
      return OKEx_Spot.getDepositAddresses(symbols);
    case 'Newdex':
      return Newdex.getDepositAddresses(symbols);
    case 'WhaleEx':
      return WhaleEx.getDepositAddresses(symbols);
    default:
      throw Error(`Unsupported exchange: ${exchangeInfo.name}`);
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
    case 'Coinbase':
      return Coinbase.getWithdrawalFees();
    case 'Huobi':
      return Huobi.getWithdrawalFees();
    case 'Newdex': {
      if (symbols === undefined || symbols.length <= 0)
        throw Error(`${exchange} requires an array of symbols`);
      return Newdex.getWithdrawalFees(symbols);
    }
    case 'OKEx_Spot':
      return OKEx_Spot.getWithdrawalFees();
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
    case 'OKEx_Spot':
      return OKEx_Spot.fetchCurrencies();
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
    case 'OKEx_Spot':
      return OKEx_Spot.fetchCurrencyStatuses();
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
    case 'Coinbase':
      result = await Coinbase.withdraw(symbol, address, amount, memo);
      break;
    case 'Huobi':
      result = await Huobi.withdraw(symbol, address, amount, platform, memo);
      break;
    case 'MXC':
      throw Error(`MXC does NOT have withdraw API`);
    case 'OKEx_Spot':
      result = await OKEx_Spot.withdraw(symbol, address, amount, platform, memo);
      break;
    case 'WhaleEx':
      throw Error(`WhaleEx does NOT have withdraw API`);
    default:
      throw Error(`Unsupported exchange: ${exchange}`);
  }

  if (result instanceof Error) throw result;
  else return result;
}
