import { isValidPrivate } from 'eosjs-ecc';
import { strict as assert } from 'assert';
import getExchangeInfo, { ExchangeInfo, PairInfo } from 'exchange-info';
import * as MXC from './order/mxc';
import * as Newdex from './order/newdex';
import * as WhaleEx from './order/whaleex';
import { UserConfig, USER_CONFIG, EOS_API_ENDPOINTS } from './config';
import { numberToString, validatePriceQuantity } from './util';

export { UserConfig } from './config';

export const SUPPORTED_EXCHANGES = ['MXC', 'Newdex', 'WhaleEx'] as const;
export type SupportedExchange = typeof SUPPORTED_EXCHANGES[number];

const exchangeInfoCache: { [key: string]: ExchangeInfo } = {};

/**
 * Initialize.
 *
 */
export async function init({
  eosAccount = '',
  eosPrivateKey = '',
  eosApiEndpoints = [],
  ethPrivateKey = '',
  whaleExApiKey = '',
  MXCAccessKey = '',
  MXCSecretKey = '',
}: UserConfig): Promise<void> {
  if (eosAccount) {
    USER_CONFIG.eosAccount = eosAccount;
    if (!isValidPrivate(eosPrivateKey)) throw Error(`Invalid EOS private key: ${eosPrivateKey}`);
    USER_CONFIG.eosPrivateKey = eosPrivateKey;

    if (eosApiEndpoints && eosApiEndpoints.length) {
      // clear EOS_API_ENDPOINTS and copy all elements of eosApiEndpoints into it
      EOS_API_ENDPOINTS.splice(0, EOS_API_ENDPOINTS.length, ...eosApiEndpoints);
    }
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

async function convertPriceAndQuantityToStrings(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<[string, string]> {
  const priceStr = numberToString(price, pairInfo.price_precision, !sell);
  const quantityStr = numberToString(quantity, pairInfo.base_precision, false);
  const orderVolume = parseFloat(priceStr) * parseFloat(quantityStr);
  if (orderVolume < pairInfo.min_order_volume) {
    throw new Error(
      `Order volume ${orderVolume}  is less than min_order_volume ${pairInfo.min_order_volume} ${
        pairInfo.normalized_pair.split('_')[1]
      }`,
    );
  }

  if (!validatePriceQuantity(priceStr, quantityStr, pairInfo)) {
    throw new Error('Validaton on price and quantity failed');
  }

  return [priceStr, quantityStr];
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
): Promise<string> {
  checkExchangeAndPair(exchange, pair);

  if (!(exchange in exchangeInfoCache)) {
    exchangeInfoCache[exchange] = await getExchangeInfo(exchange);
  }
  const pairInfo = exchangeInfoCache[exchange].pairs[pair];

  const [priceStr, quantityStr] = await convertPriceAndQuantityToStrings(
    pairInfo,
    price,
    quantity,
    sell,
  );

  switch (exchange) {
    case 'MXC':
      return MXC.placeOrder(pairInfo, priceStr, quantityStr, sell);
    case 'Newdex':
      return Newdex.placeOrder(pairInfo, priceStr, quantityStr, sell);
    case 'WhaleEx': {
      return WhaleEx.placeOrder(pairInfo, priceStr, quantityStr, sell);
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
): Promise<object | undefined> {
  assert.ok(orderId_or_transactionId);
  checkExchangeAndPair(exchange, pair);

  if (!(exchange in exchangeInfoCache)) {
    exchangeInfoCache[exchange] = await getExchangeInfo(exchange);
  }
  const pairInfo = exchangeInfoCache[exchange].pairs[pair];

  switch (exchange) {
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
