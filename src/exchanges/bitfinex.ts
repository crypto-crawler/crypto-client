import { strict as assert } from 'assert';
import Axios from 'axios';
import { normalizeSymbol } from 'crypto-pair';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { DepositAddress, WithdrawalFee } from '../pojo';
import { calcTokenPlatform, convertPriceAndQuantityToStrings, detectPlatform } from '../util';

const { RESTv1, RESTv2 } = require('bfx-api-node-rest');
const { Order } = require('bfx-api-node-models');

function createAuthenticatedClient(version: 'v1' | 'v2' = 'v2'): any {
  assert.ok(USER_CONFIG.BITFINEX_API_KEY);
  assert.ok(USER_CONFIG.BITFINEX_API_SECRET);

  const rest =
    version === 'v2'
      ? new RESTv2({
          apiKey: USER_CONFIG.BITFINEX_API_KEY!,
          apiSecret: USER_CONFIG.BITFINEX_API_SECRET!,
          transform: true, // to have full models returned by all methods
        })
      : new RESTv1({
          apiKey: USER_CONFIG.BITFINEX_API_KEY!,
          apiSecret: USER_CONFIG.BITFINEX_API_SECRET!,
        });

  return rest;
}

export async function placeOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
  clientOrderId?: string,
): Promise<string | Error> {
  try {
    assert.ok(pairInfo);

    const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(
      pairInfo,
      price,
      quantity,
      sell,
    );
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
    const arr = await authClient.submitOrder(new Order(order)).catch((e: Error) => {
      return e;
    });

    if (arr instanceof Error) return arr;
    return arr[0].toString();
  } catch (e) {
    return e;
  }
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

export async function queryAllBalancesV2(all: boolean = false): Promise<{ [key: string]: number }> {
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

export async function queryAllBalances(
  all: boolean = false,
): Promise<{ [key: string]: number } | Error> {
  const authClient = createAuthenticatedClient('v1');

  interface Item {
    type: string;
    currency: string;
    amount: string;
    available: string;
  }

  const arr = await new Promise<Item[]>((resolve, reject) => {
    authClient.wallet_balances((err: Error, data: Item[]) => {
      if (err) reject(err);
      else resolve(data);
    });
  }).catch((e: Error) => {
    return e;
  });

  if (arr instanceof Error) return arr;

  const result: { [key: string]: number } = {};
  arr.forEach((x: any) => {
    const symbol = normalizeSymbol(x.currency, 'Bitfinex');
    result[symbol] = parseFloat(all ? x.amount : x.available);
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

const USDT_METHOD_MAP: { [key: string]: string } = {
  OMNI: 'tetheruso',
  ERC20: 'tetheruse',
  TRC20: 'tetherusx',
  EOS: 'tetheruss',
  LIQUID: 'tetherusl',
};

async function fetchMethod(): Promise<{
  [key: string]: { method: string; rawSymbol: string };
}> {
  const response = await Axios.get('https://api-pub.bitfinex.com//v2/conf/pub:map:tx:method');
  assert.equal(response.status, 200);

  const symbolMethodMap: { [key: string]: { method: string; rawSymbol: string } } = {};
  const arr = response.data[0] as [string, string[]][];
  arr.forEach(x => {
    assert.equal(x.length, 2);
    const [method, currencies] = x;
    currencies.forEach(rawSymbol => {
      if (rawSymbol === 'USD') return; // skip USD

      const symbol = normalizeSymbol(rawSymbol, 'Bitfinex');
      symbolMethodMap[symbol] = {
        method: method.toLowerCase(),
        rawSymbol,
      };
    });
  });
  return symbolMethodMap;
}

export async function getDepositAddresses(
  symbols: string[],
): Promise<{ [key: string]: { [key: string]: DepositAddress } }> {
  assert.ok(symbols.length);

  const ethAddress = ((await fetchDepositAddress('Ethereum')) as {
    address: string;
    memo?: string | undefined;
  }).address;
  const trxAddress = ((await fetchDepositAddress('TRX')) as {
    address: string;
    memo?: string | undefined;
  }).address;
  assert.ok(ethAddress);
  assert.ok(trxAddress);

  const symbolMethodMap = await fetchMethod();

  const result: { [key: string]: { [key: string]: DepositAddress } } = {};
  for (let i = 0; i < symbols.length; i += 1) {
    const symbol = symbols[i];

    const symbolOrLabels =
      symbol === 'USDT'
        ? Object.values(USDT_METHOD_MAP).map(x => x.toLowerCase())
        : [symbol in symbolMethodMap ? symbolMethodMap[symbol].method : symbol];

    for (let j = 0; j < symbolOrLabels.length; j += 1) {
      // eslint-disable-next-line no-await-in-loop
      const address = await fetchDepositAddress(symbolOrLabels[j]);

      if (!(address instanceof Error)) {
        if (!(symbol in result)) result[symbol] = {};
        let platform = symbol;
        if (address.address === ethAddress && symbol !== 'ETH' && symbol !== 'ETC') {
          platform = 'ERC20';
          assert.equal(platform, detectPlatform(address.address, symbol));
        }
        if (address.address === trxAddress && symbol !== 'TRX') {
          platform = 'TRC20';
          assert.equal(platform, detectPlatform(address.address, symbol));
        }
        result[symbol][platform] = { symbol, platform, ...address };
      }
    }
  }

  return result;
}

export async function getWithdrawalFees(): Promise<{
  [key: string]: { [key: string]: WithdrawalFee };
}> {
  const client = createAuthenticatedClient();
  const data = (await client.accountFees()) as { withdraw: { [key: string]: string } };

  Object.keys(data.withdraw).forEach(rawSymbol => {
    const normalizedSymbol = normalizeSymbol(rawSymbol, 'Bitfinex');
    data.withdraw[normalizedSymbol] = data.withdraw[rawSymbol];
  });

  const depositAddresses = await getDepositAddresses(
    Object.keys(data.withdraw).map(rawSymbol => normalizeSymbol(rawSymbol, 'Bitfinex')),
  );
  const tokenPlatformMap = calcTokenPlatform(depositAddresses);

  const result: { [key: string]: { [key: string]: WithdrawalFee } } = {};
  Object.keys(data.withdraw).forEach(rawSymbol => {
    const symbol = normalizeSymbol(rawSymbol, 'Bitfinex');
    if (!(symbol in result)) result[symbol] = {};
    const platform = tokenPlatformMap[symbol] || symbol;

    result[symbol][platform] = {
      symbol,
      platform: tokenPlatformMap[symbol] || symbol,
      fee: parseFloat(data.withdraw[symbol]),
      min: 0,
    };
  });

  return result;
}

async function fetchUSDPrice(
  symbol: string,
  symbolMethodMap: { [key: string]: { method: string; rawSymbol: string } },
): Promise<number> {
  const rawSymbol = symbol in symbolMethodMap ? symbolMethodMap[symbol].rawSymbol : symbol;
  const response = await Axios.get(`https://api-pub.bitfinex.com/v2/ticker/t${rawSymbol}USD`);
  assert.equal(response.status, 200);

  if (response.data[0] === 'error') return -1;

  const arr = response.data as number[];
  return arr[6];
}

export async function withdraw(
  symbol: string,
  address: string,
  amount: number,
  memo?: string,
  platform?: string,
  params: { [key: string]: string | number | boolean } = {},
): Promise<string | Error> {
  if (!params.wallet) return new Error('wallet should be one of exchange, margin and funding');

  const symbolMethodMap = await fetchMethod();
  const price = await fetchUSDPrice(symbol, symbolMethodMap);
  if (amount * price < 5)
    return new Error(`${amount} ${symbol} value is less than 5 USD. Current price is $${price}`);

  const method = symbol === 'USDT' ? USDT_METHOD_MAP[platform!] : symbolMethodMap[symbol].method;
  if (method === undefined) return new Error(`Bitfinex ${symbol} can NOT find method`);

  Object.assign(params, { address, amount: amount.toString(), method });
  if (memo) params.memo = memo; // eslint-disable-line no-param-reassign

  try {
    const data = await createAuthenticatedClient().withdraw(params);
    assert.equal(data.status, 'SUCCESS');
    if (data.notifyInfo[0] === 0) return new Error(data.text);
    return data.notifyInfo[0].toString();
  } catch (e) {
    return e;
  }
}
