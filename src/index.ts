import { isValidPrivate } from 'eosjs-ecc';
import { strict as assert } from 'assert';
import * as MXC from './order/mxc';
import * as Newdex from './order/newdex';
import * as WhaleEx from './order/whaleex';
import { UserConfig, USER_CONFIG, EOS_API_ENDPOINTS } from './config';

export const EXCHANGES = ['MXC', 'Newdex', 'WhaleEx'] as const;
export type SupportedExchange = typeof EXCHANGES[number];

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
  price: string,
  quantity: string,
  sell: boolean,
): Promise<string> {
  assert.ok(exchange);
  assert.ok(pair);
  assert.equal(pair.split('_').length, 2);
  if (['Newdex', 'WhaleEx'].includes(exchange)) {
    const quoteCurrency = pair.split('_')[1];
    if (quoteCurrency === 'EOS') {
      assert.strictEqual(USER_CONFIG.eosAccount!.length > 0, true);
      assert.strictEqual(USER_CONFIG.eosPrivateKey!.length > 0, true);
    }
  }

  switch (exchange) {
    case 'MXC':
      return MXC.placeOrder(pair, price, quantity, sell);
    case 'Newdex':
      return Newdex.placeOrder(pair, price, quantity, sell);
    case 'WhaleEx': {
      return WhaleEx.placeOrder(pair, price, quantity, sell);
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
  exchange: string,
  pair: string,
  orderId_or_transactionId: string,
): Promise<boolean | string> {
  assert.ok(exchange);
  assert.ok(pair);
  assert.ok(orderId_or_transactionId);
  assert.equal(pair.split('_').length, 2);
  if (['Newdex', 'WhaleEx'].includes(exchange)) {
    const quoteCurrency = pair.split('_')[1];
    if (quoteCurrency === 'EOS') {
      assert.strictEqual(USER_CONFIG.eosAccount!.length > 0, true);
      assert.strictEqual(USER_CONFIG.eosPrivateKey!.length > 0, true);
    }
  }

  switch (exchange) {
    case 'MXC':
      return MXC.cancelOrder(pair, orderId_or_transactionId);
    case 'Newdex':
      return Newdex.cancelOrder(pair, orderId_or_transactionId);
    case 'WhaleEx':
      return WhaleEx.cancelOrder(pair, orderId_or_transactionId);
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
  exchange: string,
  pair: string,
  orderId_or_transactionId: string,
): Promise<object | undefined> {
  assert.ok(exchange);
  assert.ok(pair);
  assert.ok(orderId_or_transactionId);
  assert.equal(pair.split('_').length, 2);

  switch (exchange) {
    case 'MXC':
      return MXC.queryOrder(pair, orderId_or_transactionId);
    case 'Newdex':
      return Newdex.queryOrder(pair, orderId_or_transactionId);
    case 'WhaleEx':
      return WhaleEx.queryOrder(pair, orderId_or_transactionId);
    default:
      throw Error(`Unknown exchange: ${exchange}`);
  }
}
