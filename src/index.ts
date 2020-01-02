import { strict as assert } from 'assert';
import { isValidPrivate } from 'eosjs-ecc';
import getExchangeInfo, { ExchangeInfo } from 'exchange-info';
import { UserConfig, USER_CONFIG } from './config';
import * as Binance from './order/binance';
import * as Bitstamp from './order/bitstamp';
import * as Coinbase from './order/coinbase';
import * as Huobi from './order/huobi';
import * as MXC from './order/mxc';
import * as Newdex from './order/newdex';
import * as WhaleEx from './order/whaleex';
import { createOrder as createOrderWhaleEx } from './order/whaleex_eos';
import { ActionExtended } from './pojo';

export { UserConfig } from './config';

export const SUPPORTED_EXCHANGES = [
  'Binance',
  'Bitstamp',
  'Coinbase',
  'Huobi',
  'MXC',
  'Newdex',
  'WhaleEx',
] as const;
export type SupportedExchange = typeof SUPPORTED_EXCHANGES[number];

const exchangeInfoCache: { [key: string]: ExchangeInfo } = {};

/**
 * Initialize.
 *
 */
export async function init({
  eosAccount = '',
  eosPrivateKey = '',
  ethPrivateKey = '',
  whaleExApiKey = '',
  MXCAccessKey = '',
  MXCSecretKey = '',
  CB_ACCESS_KEY = '',
  CB_ACCESS_SECRET = '',
  CB_ACCESS_PASSPHRASE = '',
  BINANCE_API_KEY = '',
  BINANCE_API_SECRET = '',
  BITSTAMP_USER_ID = 0,
  BITSTAMP_API_KEY = '',
  BITSTAMP_API_SECRET = '',
  HUOBI_ACCESS_KEY = '',
  HUOBI_SECRET_KEY = '',
  HUOBI_ACCOUNT_ID = 0,
}: UserConfig): Promise<void> {
  if (eosAccount) {
    USER_CONFIG.eosAccount = eosAccount;
    if (!isValidPrivate(eosPrivateKey)) throw Error(`Invalid EOS private key: ${eosPrivateKey}`);
    USER_CONFIG.eosPrivateKey = eosPrivateKey;
  }

  if (ethPrivateKey) USER_CONFIG.ethPrivateKey = ethPrivateKey;

  if (whaleExApiKey) {
    await WhaleEx.initilize(whaleExApiKey);
  }
  if (MXCAccessKey) {
    assert.ok(MXCSecretKey);
    USER_CONFIG.MXCAccessKey = MXCAccessKey!;
    USER_CONFIG.MXCSecretKey = MXCSecretKey!;
  }
  if (CB_ACCESS_KEY) {
    assert.ok(CB_ACCESS_SECRET);
    assert.ok(CB_ACCESS_PASSPHRASE);
    USER_CONFIG.CB_ACCESS_KEY = CB_ACCESS_KEY;
    USER_CONFIG.CB_ACCESS_SECRET = CB_ACCESS_SECRET;
    USER_CONFIG.CB_ACCESS_PASSPHRASE = CB_ACCESS_PASSPHRASE;
  }
  if (BINANCE_API_KEY) {
    assert.ok(BINANCE_API_SECRET);
    USER_CONFIG.BINANCE_API_KEY = BINANCE_API_KEY;
    USER_CONFIG.BINANCE_API_SECRET = BINANCE_API_SECRET;
  }
  if (BITSTAMP_API_KEY) {
    assert.ok(BITSTAMP_API_SECRET);
    USER_CONFIG.BITSTAMP_API_KEY = BITSTAMP_API_KEY;
    USER_CONFIG.BITSTAMP_API_SECRET = BITSTAMP_API_SECRET;
    USER_CONFIG.BITSTAMP_USER_ID = BITSTAMP_USER_ID;
  }
  if (HUOBI_ACCESS_KEY) {
    assert.ok(HUOBI_SECRET_KEY);
    USER_CONFIG.HUOBI_ACCESS_KEY = HUOBI_ACCESS_KEY;
    USER_CONFIG.HUOBI_SECRET_KEY = HUOBI_SECRET_KEY;
    USER_CONFIG.HUOBI_ACCOUNT_ID =
      HUOBI_ACCOUNT_ID || (await Huobi.queryAccounts()).filter(x => x.type === 'spot')[0].id;
  }
}

function checkExchangeAndPair(exchange: SupportedExchange, pair: string): boolean {
  assert.ok(exchange);
  assert.ok(SUPPORTED_EXCHANGES.includes(exchange), `Unknown exchange: ${exchange}`);
  assert.ok(pair);
  assert.equal(pair.split('_').length, 2);
  if (['Newdex', 'WhaleEx'].includes(exchange)) {
    const quoteCurrency = pair.split('_')[1];
    if (quoteCurrency === 'EOS') {
      assert.strictEqual(USER_CONFIG.eosAccount!.length > 0, true);
      assert.strictEqual(USER_CONFIG.eosPrivateKey!.length > 0, true);
    }
  }
  return true;
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
  exchange: 'Newdex' | 'WhaleEx',
  pair: string,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<ActionExtended> {
  checkExchangeAndPair(exchange, pair);

  if (!(exchange in exchangeInfoCache)) {
    exchangeInfoCache[exchange] = await getExchangeInfo(exchange);
  }
  const pairInfo = exchangeInfoCache[exchange].pairs[pair];

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
  exchange: SupportedExchange,
  pair: string,
  price: number,
  quantity: number,
  sell: boolean,
  clientOrderId?: string,
): Promise<string> {
  checkExchangeAndPair(exchange, pair);

  if (!(exchange in exchangeInfoCache)) {
    exchangeInfoCache[exchange] = await getExchangeInfo(exchange);
  }
  const pairInfo = exchangeInfoCache[exchange].pairs[pair];

  switch (exchange) {
    case 'Binance':
      return Binance.placeOrder(pairInfo, price, quantity, sell);
    case 'Bitstamp':
      return Bitstamp.placeOrder(pairInfo, price, quantity, sell);
    case 'Coinbase':
      return Coinbase.placeOrder(pairInfo, price, quantity, sell);
    case 'Huobi':
      return Huobi.placeOrder(pairInfo, price, quantity, sell, clientOrderId);
    case 'MXC':
      return MXC.placeOrder(pairInfo, price, quantity, sell);
    case 'Newdex':
      return Newdex.placeOrder(pairInfo, price, quantity, sell);
    case 'WhaleEx': {
      return WhaleEx.placeOrder(pairInfo, price, quantity, sell);
    }
    default:
      throw Error(`Unknown exchange: ${exchange}`);
  }
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
  exchange: SupportedExchange,
  pair: string,
  orderId_or_transactionId: string,
): Promise<boolean | string> {
  assert.ok(orderId_or_transactionId);
  checkExchangeAndPair(exchange, pair);

  if (!(exchange in exchangeInfoCache)) {
    exchangeInfoCache[exchange] = await getExchangeInfo(exchange);
  }
  const pairInfo = exchangeInfoCache[exchange].pairs[pair];

  switch (exchange) {
    case 'Binance':
      return Binance.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'Bitstamp':
      return Bitstamp.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'Coinbase':
      return Coinbase.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'Huobi':
      return Huobi.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'MXC':
      return MXC.cancelOrder(pairInfo, orderId_or_transactionId);
    case 'Newdex':
      return Newdex.cancelOrder(pairInfo, orderId_or_transactionId);
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
 * @param orderId_or_transactionId orderId if central, transactionId if dex
 * @returns The order information
 */
export async function queryOrder(
  exchange: SupportedExchange,
  pair: string,
  orderId_or_transactionId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(orderId_or_transactionId);
  checkExchangeAndPair(exchange, pair);

  if (!(exchange in exchangeInfoCache)) {
    exchangeInfoCache[exchange] = await getExchangeInfo(exchange);
  }
  const pairInfo = exchangeInfoCache[exchange].pairs[pair];

  switch (exchange) {
    case 'Binance':
      return Binance.queryOrder(pairInfo, orderId_or_transactionId);
    case 'Bitstamp':
      return Bitstamp.queryOrder(pairInfo, orderId_or_transactionId);
    case 'Coinbase':
      return Coinbase.queryOrder(pairInfo, orderId_or_transactionId);
    case 'Huobi':
      return Huobi.queryOrder(pairInfo, orderId_or_transactionId);
    case 'MXC':
      return MXC.queryOrder(pairInfo, orderId_or_transactionId);
    case 'Newdex':
      return Newdex.queryOrder(pairInfo, orderId_or_transactionId);
    case 'WhaleEx':
      return WhaleEx.queryOrder(pairInfo, orderId_or_transactionId);
    default:
      throw Error(`Unknown exchange: ${exchange}`);
  }
}

export async function queryBalance(exchange: SupportedExchange, symbol: string): Promise<number> {
  switch (exchange) {
    case 'Binance':
      return Binance.queryBalance(symbol);
    case 'Bitstamp':
      return Bitstamp.queryBalance(symbol);
    case 'Coinbase':
      return Coinbase.queryBalance(symbol);
    case 'MXC':
      return MXC.queryBalance(symbol);
    case 'Newdex':
      return Newdex.queryBalance(symbol);
    case 'WhaleEx':
      return WhaleEx.queryBalance(symbol);
    default:
      throw Error(`Unknown exchange: ${exchange}`);
  }
}
