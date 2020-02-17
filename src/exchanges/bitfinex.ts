import { strict as assert } from 'assert';
import { normalizeSymbol } from 'crypto-pair';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { DepositAddress, WithdrawalFee } from '../pojo';
import { convertPriceAndQuantityToStrings } from '../util';

const { RESTv2 } = require('bfx-api-node-rest');
const { Order } = require('bfx-api-node-models');

function createAuthenticatedClient(): any {
  assert.ok(USER_CONFIG.BITFINEX_API_KEY);
  assert.ok(USER_CONFIG.BITFINEX_API_SECRET);

  const rest = new RESTv2({
    apiKey: USER_CONFIG.BITFINEX_API_KEY!,
    apiSecret: USER_CONFIG.BITFINEX_API_SECRET!,
    transform: true, // to have full models returned by all methods
  });

  return rest;
}

export async function placeOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
  clientOrderId?: string,
): Promise<string> {
  assert.ok(pairInfo);

  const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(pairInfo, price, quantity, sell);
  const order: { [key: string]: string | number } = {
    type: 'EXCHANGE LIMIT',
    symbol: `t${pairInfo.raw_pair.toUpperCase()}`,
    price: priceStr,
    amount: `${sell ? '-' : ''}${quantityStr}`, // positive for buy, negative for sell
  };
  if (clientOrderId) {
    order.cid = parseInt(clientOrderId, 10);
  }

  const authClient = createAuthenticatedClient();
  const arr = await authClient.submitOrder(new Order(order));
  return arr[0].toString();
}

export async function cancelOrder(pairInfo: PairInfo, orderId: string): Promise<boolean> {
  assert.ok(pairInfo);

  const authClient = createAuthenticatedClient();
  try {
    const arr = (await authClient.cancelOrder(parseInt(orderId, 10))) as any[];
    const order = Order.unserialize(arr);
    return order.id === parseInt(orderId, 10);
  } catch (e) {
    return false;
  }
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const authClient = createAuthenticatedClient();
  // eslint-disable-next-line no-underscore-dangle
  const arr = await authClient._makeAuthRequest(
    '/auth/r/orders',
    { id: [parseInt(orderId, 10)] },
    undefined,
    Order,
  );

  if (arr.length === 0) return undefined;

  assert.equal(arr.length, 1);
  return arr[0];
}

export async function queryAllBalances(all: boolean = false): Promise<{ [key: string]: number }> {
  const authClient = createAuthenticatedClient();

  const wallets = (await authClient.wallets()) as any[];
  const arr = wallets.filter(x => !all && x.type === 'exchange');

  const result: { [key: string]: number } = {};
  arr.forEach(x => {
    const pair = normalizeSymbol(x.currency, 'Bitfinex');
    result[pair] = x.balance;
  });

  return result;
}

export async function fetchDepositAddress(
  symbolOrLabel: string,
): Promise<{ address: string; memo?: string } | Error> {
  try {
    const client = createAuthenticatedClient();
    const data = await client.getDepositAddress({
      wallet: 'exchange',
      method: symbolOrLabel,
      opRenew: 0,
    });

    if (symbolOrLabel === 'EOS') {
      return {
        address: data.notifyInfo[5],
        memo: data.notifyInfo[4],
      };
    }

    return {
      address: data.notifyInfo[4],
    };
  } catch (e) {
    return e;
  }
}

// The following symbols use label to get deposit addresses.
const SYMBOL_LABEL_MAP: { [key: string]: string } = {
  AVT: 'Aventus',
  BTC: 'Bitcoin',
  DASH: 'Dash',
  EDO: 'Eidoo',
  ETH: 'Ethereum',
  GNT: 'Golem',
  IOTA: 'Iota',
  LTC: 'Litecoin',
  OMG: 'OmiseGO',
  ORSGROUP: 'ORS',
  QTUM: 'Qtum',
  SAN: 'Santiment',
  SNT: 'Status',
  XMR: 'Monero',
  XRP: 'Ripple',
  ZEC: 'Zcash',
};

export async function getDepositAddresses(
  symbols: string[],
): Promise<{ [key: string]: DepositAddress }> {
  assert.ok(symbols.length);

  const result: { [key: string]: DepositAddress } = {};
  for (let i = 0; i < symbols.length; i += 1) {
    const symbol = symbols[i];

    const symbolOrLabel = symbol in SYMBOL_LABEL_MAP ? SYMBOL_LABEL_MAP[symbol] : symbol;

    // eslint-disable-next-line no-await-in-loop
    const address = await fetchDepositAddress(symbolOrLabel);

    if (!(address instanceof Error)) {
      result[symbol] = { symbol, ...address };
    }
  }

  return result;
}

export async function getWithdrawalFees(
  symbols: string[],
): Promise<{ [key: string]: WithdrawalFee }> {
  assert.ok(symbols.length);

  const client = createAuthenticatedClient();
  const data = (await client.accountFees()) as { withdraw: { [key: string]: string } };

  Object.keys(data.withdraw).forEach(rawSymbol => {
    const normalizedSymbol = normalizeSymbol(rawSymbol, 'Bitfinex');
    data.withdraw[normalizedSymbol] = data.withdraw[rawSymbol];
  });

  const result: { [key: string]: WithdrawalFee } = {};
  symbols.forEach(symbol => {
    if (!(symbol in data.withdraw)) return;

    result[symbol] = {
      symbol,
      withdrawal_fee: parseFloat(data.withdraw[symbol]),
      min_withdraw_amount: 0,
    };
  });

  return result;
}
