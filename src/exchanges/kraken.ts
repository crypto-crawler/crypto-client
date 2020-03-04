import assert from 'assert';
import Axios from 'axios';
import crypto from 'crypto';
import { normalizeSymbol } from 'crypto-pair';
import { PairInfo } from 'exchange-info';
import { getAllWithdrawalFees, getWithdrawalFee } from 'kraken-withdrawal-fee';
import qs from 'qs';
import { USER_CONFIG } from '../config';
import { DepositAddress, WithdrawalFee } from '../pojo';
import { convertPriceAndQuantityToStrings, detectPlatform, FIAT_SYMBOLS, sleep } from '../util';

const API_ENDPOINT = 'https://api.kraken.com';

function generateNonce(): number {
  return Date.now() * 1000;
}

function getSignature(
  path: string,
  params: { nonce: number; [key: string]: string | number | boolean },
  privateKey: string,
): string {
  const message = qs.stringify(params);
  const decryptedKey = Buffer.from(privateKey, 'base64');

  const hashDigest = crypto
    .createHash('sha256')
    .update(params.nonce + message)
    .digest('latin1');
  const hmacDigest = crypto
    .createHmac('sha512', decryptedKey)
    .update(path + hashDigest, 'latin1')
    .digest('base64');

  return hmacDigest;
}

async function privateMethod<T>(
  path: string,
  params: { nonce: number; [key: string]: string | number | boolean },
): Promise<T | Error> {
  assert.ok(USER_CONFIG.KRAKEN_API_KEY);
  assert.ok(USER_CONFIG.KRAKEN_PRIVATE_KEY);
  assert.ok(params.nonce);

  const url = `${API_ENDPOINT}${path}`;

  const signature = getSignature(path, params, USER_CONFIG.KRAKEN_PRIVATE_KEY!);
  const headers = {
    'API-Key': USER_CONFIG.KRAKEN_API_KEY!,
    'API-Sign': signature,
  };

  const response = await Axios.post(url, qs.stringify(params), { headers }).catch((e: Error) => {
    return e;
  });
  if (response instanceof Error) return response;
  assert.equal(response.status, 200);

  if (response.data.error.length > 0) {
    return new Error((response.data.error as string[]).join('\n'));
  }
  return response.data.result;
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
    assert.ok(USER_CONFIG.KRAKEN_PRIVATE_KEY);
    assert.ok(USER_CONFIG.KRAKEN_PRIVATE_KEY);

    const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(
      pairInfo,
      price,
      quantity,
      sell,
    );
    assert.ok(priceStr);
    assert.ok(quantityStr);

    const path = '/0/private/AddOrder';

    const params: { nonce: number; [key: string]: string | number } = {
      pair: pairInfo.raw_pair,
      type: sell ? 'sell' : 'buy',
      ordertype: 'limit',
      price,
      volume: quantity,
      nonce: generateNonce(),
    };
    if (clientOrderId) {
      params.userref = parseInt(clientOrderId, 10);
    }

    const data = await privateMethod<{ txid: string[] }>(path, params);
    if (data instanceof Error) return data;
    assert.ok(data.txid.length > 0);
    return data.txid[0]; // TODO: handle txid.length > 1
  } catch (e) {
    return e;
  }
}

export async function cancelOrder(
  pairInfo: PairInfo,
  orderId: string,
  clientOrderId?: string,
): Promise<boolean> {
  assert.ok(pairInfo);

  const path = '/0/private/CancelOrder';

  const params: { nonce: number; [key: string]: string | number } = {
    txid: orderId,
    nonce: generateNonce(),
  };
  if (clientOrderId) {
    params.txid = parseInt(clientOrderId, 10);
  }

  const data = await privateMethod<{ count: number }>(path, params);
  if (data instanceof Error) return false;
  return data.count > 0;
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
  clientOrderId?: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const path = '/0/private/QueryOrders';

  const params: { nonce: number; [key: string]: string | number } = {
    txid: orderId,
    nonce: generateNonce(),
  };
  if (clientOrderId) {
    params.userref = parseInt(clientOrderId, 10);
  }

  const data = await privateMethod<{ [key: string]: any }>(path, params);
  if (data instanceof Error) return undefined;
  return data[orderId];
}

export async function queryAllBalances(all: boolean = false): Promise<{ [key: string]: number }> {
  const path = '/0/private/BalanceEx';

  const balances = await privateMethod<{ [key: string]: { balance: string; hold_trade: string } }>(
    path,
    {
      nonce: generateNonce(),
    },
  );
  if (balances instanceof Error) return {};

  const result: { [key: string]: number } = {};
  Object.keys(balances).forEach(symbol => {
    const symbolNormalized = normalizeSymbol(symbol, 'Kraken');
    result[symbolNormalized] = all
      ? parseFloat(balances[symbol].balance)
      : parseFloat(balances[symbol].balance) - parseFloat(balances[symbol].hold_trade);
  });

  return result;
}

async function getDepositMethod(
  symbol: string,
): Promise<
  | {
      method: string;
      limit: boolean | string;
      fee: string;
      'gen-address': boolean;
    }
  | Error
> {
  assert.ok(symbol);
  assert.ok(
    !FIAT_SYMBOLS.includes(symbol),
    `Fiat currency ${symbol} is not supported, only cryptocurrencies are supported`,
  );

  if (symbol === 'DOGE') symbol = 'XDG'; // eslint-disable-line no-param-reassign
  if (symbol === 'USDT') {
    // see https://support.kraken.com/hc/en-us/requests/2732113
    return {
      method: 'Tether USD',
      limit: false,
      fee: '0.00000000',
      'gen-address': true,
    };
  }

  const path = '/0/private/DepositMethods';

  const params: { nonce: number; [key: string]: string | number } = {
    asset: symbol,
    nonce: generateNonce(),
  };

  const arr = await privateMethod<
    {
      method: string;
      limit: boolean | string;
      fee: string;
      'gen-address': boolean;
    }[]
  >(path, params);
  if (arr instanceof Error) return arr;

  assert.equal(arr.length, 1);

  return arr[0];
}

export async function getDepositAddress(
  symbol: string,
  generateNew: boolean = false,
): Promise<DepositAddress | Error> {
  assert.ok(symbol);
  assert.ok(
    !FIAT_SYMBOLS.includes(symbol),
    `Fiat currency ${symbol} is not supported, only cryptocurrencies are supported`,
  );

  const depositMethod = await getDepositMethod(symbol);
  if (depositMethod instanceof Error) return depositMethod;

  const path = '/0/private/DepositAddresses';

  const params: { nonce: number; [key: string]: string | number | boolean } = {
    asset: symbol === 'DOGE' ? 'XDG' : symbol,
    method: depositMethod.method,
    nonce: generateNonce(),
  };
  if (generateNew) params.new = true;

  const arr = await privateMethod<
    readonly {
      address: string;
      expiretm: string;
      memo?: string;
    }[]
  >(path, params);
  if (arr instanceof Error) return arr;
  if (arr.length <= 0) return new Error('Returned empty array');

  const address = arr[arr.length - 1]; // prefer the oldest address

  const platform: string = detectPlatform(address.address, symbol) || symbol;

  const result: DepositAddress = {
    symbol,
    platform,
    address: address.address,
  };
  if (address.memo) result.memo = address.memo;
  if (parseFloat(depositMethod.fee) > 0) result.fee = parseFloat(depositMethod.fee);
  if (typeof depositMethod.limit === 'string')
    result.max_deposit_amount = parseFloat(depositMethod.limit);

  return result;
}

export async function getDepositAddresses(
  symbols: string[],
): Promise<{ [key: string]: { [key: string]: DepositAddress } }> {
  assert.ok(symbols.length);
  symbols = symbols.filter(symbol => !FIAT_SYMBOLS.includes(symbol)); // eslint-disable-line no-param-reassign

  const result: { [key: string]: { [key: string]: DepositAddress } } = {};

  for (let i = 0; i < symbols.length; i += 1) {
    const symbol = symbols[i];
    if (!(symbol in result)) result[symbol] = {};

    const data = await getDepositAddress(symbol); // eslint-disable-line no-await-in-loop
    await sleep(3000); // eslint-disable-line no-await-in-loop
    if (!(data instanceof Error)) {
      result[symbol][data.platform] = data;
    } else {
      // generate new address
      const newAddress = await getDepositAddress(symbol, true); // eslint-disable-line no-await-in-loop
      await sleep(3000); // eslint-disable-line no-await-in-loop
      if (!(newAddress instanceof Error)) {
        result[symbol][newAddress.platform] = newAddress;
      }
    }
  }

  return result;
}

export async function fetchWithdrawInfo(
  symbol: string,
  key: string,
  amount: number,
): Promise<{ method: string; fee: number } | Error> {
  const path = '/0/private/WithdrawInfo';

  const params: { nonce: number; [key: string]: string | number } = {
    asset: symbol === 'DOGE' ? 'XDG' : symbol,
    nonce: generateNonce(),
    key,
    amount,
  };

  const data = await privateMethod<{
    method: string;
    limit: string;
    amount: string;
    fee: string;
  }>(path, params);
  if (data instanceof Error) return data;

  return { method: data.method, fee: parseFloat(data.fee) };
}

export async function getWithdrawalFees(): Promise<{
  [key: string]: { [key: string]: WithdrawalFee };
}> {
  const result: { [key: string]: { [key: string]: WithdrawalFee } } = {};

  const fees = getAllWithdrawalFees();
  Object.keys(fees).forEach(symbol => {
    const platform = fees[symbol].platform || symbol;
    if (!(symbol in result)) result[symbol] = {};

    result[symbol][platform] = {
      symbol,
      platform,
      fee: fees[symbol].fee,
      min: fees[symbol].min,
    };
  });
  return result;
}

export async function withdraw(
  symbol: string,
  platform: string,
  key: string,
  amount: number,
): Promise<string | Error> {
  if (!key) {
    return new Error('Kraken withdraw requires a key');
  }
  const withdrawInfo = await fetchWithdrawInfo(symbol, key, amount);
  if (withdrawInfo instanceof Error) return withdrawInfo;

  const withdrawalFee = getWithdrawalFee(symbol);
  if (withdrawalFee === undefined) {
    return new Error(`${symbol} doesn't  exist in package kraken-withdrawal-fee`);
  }

  if (Math.abs(withdrawInfo.fee - withdrawalFee.fee) > Number.EPSILON) {
    return new Error(
      `fee from package kraken-withdrawal-fee is not consistent with API /0/private/WithdrawInfo`,
    );
  }
  if (amount < withdrawalFee.min) {
    return new Error(`amount ${amount} is less than min ${withdrawalFee.min}`);
  }
  if (withdrawalFee.platform && platform !== withdrawalFee.platform) {
    return new Error(
      `platform ${platform} is not identical with withdrawalFee.platform ${withdrawalFee.platform}`,
    );
  }

  const params = {
    asset: symbol === 'DOGE' ? 'XDG' : symbol,
    nonce: generateNonce(),
    amount,
    key,
  };
  const data = await privateMethod<{ refid: string }>('/0/private/Withdraw', params);
  if (data instanceof Error) return data;

  return data.refid;
}
