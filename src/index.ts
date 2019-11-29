import { isValidPrivate } from 'eosjs-ecc';
import { strict as assert } from 'assert';
import * as Newdex from './order/newdex';
import { UserConfig, USER_CONFIG, EOS_API_ENDPOINTS } from './config';

export const EXCHANGES = ['Newdex', 'WhaleEx'] as const;
export type SupportedExchange = typeof EXCHANGES[number];

export async function init({
  eosAccount = '',
  eosPrivateKey = '',
  eosApiEndpoints = [],
  ethPrivateKey = '',
}: UserConfig): Promise<void> {
  if (!((eosAccount && eosPrivateKey) || ethPrivateKey)) {
    throw new Error('There should be at leaset one valid configuration.');
  }

  if (eosAccount) USER_CONFIG.eosAccount = eosAccount;

  if (!isValidPrivate(eosPrivateKey)) throw Error(`Invalid EOS private key: ${eosPrivateKey}`);
  USER_CONFIG.eosPrivateKey = eosPrivateKey;

  if (eosApiEndpoints && eosApiEndpoints.length) {
    // clear EOS_API_ENDPOINTS and copy all elements of eosApiEndpoints into it
    EOS_API_ENDPOINTS.splice(0, EOS_API_ENDPOINTS.length, ...eosApiEndpoints);
  }

  if (ethPrivateKey) USER_CONFIG.ethPrivateKey = ethPrivateKey;
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
  assert.equal(pair.split('_').length, 2);
  const quoteCurrency = pair.split('_')[1];
  if (quoteCurrency === 'EOS') {
    assert.strictEqual(USER_CONFIG.eosAccount!.length > 0, true);
    assert.strictEqual(USER_CONFIG.eosPrivateKey!.length > 0, true);
  }

  switch (exchange) {
    case 'Newdex':
      return Newdex.placeOrder(pair, price, quantity, sell);
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
  assert.ok(orderId_or_transactionId);
  assert.equal(pair.split('_').length, 2);
  const quoteCurrency = pair.split('_')[1];
  if (quoteCurrency === 'EOS') {
    assert.strictEqual(USER_CONFIG.eosAccount!.length > 0, true);
    assert.strictEqual(USER_CONFIG.eosPrivateKey!.length > 0, true);
  }

  switch (exchange) {
    case 'Newdex': {
      return Newdex.cancelOrder(orderId_or_transactionId);
    }
    default:
      throw Error(`Unknown exchange: ${exchange}`);
  }
}

export async function queryOrder(
  exchange: string,
  pair: string,
  orderId_or_transactionId: string,
): Promise<object | undefined> {
  assert.ok(exchange);
  assert.ok(orderId_or_transactionId);
  assert.equal(pair.split('_').length, 2);

  switch (exchange) {
    case 'Newdex': {
      return Newdex.queryOrder(pair, orderId_or_transactionId);
    }
    default:
      throw Error(`Unknown exchange: ${exchange}`);
  }
}
