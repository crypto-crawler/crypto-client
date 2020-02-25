import { strict as assert } from 'assert';
import Axios from 'axios';
import crypto from 'crypto';
import { normalizeSymbol } from 'crypto-pair';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { CurrencyStatus, DepositAddress, WithdrawalFee } from '../pojo';
import { Currency } from '../pojo/currency';
import { convertPriceAndQuantityToStrings, numberToString } from '../util';

const DOMAIN = 'api.huobi.pro';
const API_ENDPOINT = `https://${DOMAIN}`;

function signRequest(
  method: 'GET' | 'POST',
  requestPath: string,
  params: { [key: string]: any } = {},
): string {
  assert.ok(USER_CONFIG.HUOBI_ACCESS_KEY);
  assert.ok(USER_CONFIG.HUOBI_SECRET_KEY);
  /* eslint-disable no-param-reassign */
  params.Timestamp = new Date().toISOString().replace(/\..+/, ''); // .getTime()+ Huobi.info.timeOffset;
  params.SignatureMethod = 'HmacSHA256';
  params.SignatureVersion = 2;
  params.AccessKeyId = USER_CONFIG.HUOBI_ACCESS_KEY!;
  /* eslint-enable no-param-reassign */

  const query = Object.keys(params)
    .sort()
    .reduce((a: string[], k) => {
      a.push(`${k}=${encodeURIComponent(params[k])}`);
      return a;
    }, [])
    .join('&');

  const source = `${method}\n${DOMAIN}\n${requestPath}\n${query}`;
  let signature = crypto
    .createHmac('sha256', USER_CONFIG.HUOBI_SECRET_KEY!)
    .update(source)
    .digest('base64'); // digest('hex'); // set the HMAC hash header
  signature = encodeURIComponent(signature);

  return `${API_ENDPOINT}${requestPath}?${query}&Signature=${signature}`;
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
    assert.ok(USER_CONFIG.HUOBI_ACCESS_KEY);
    assert.ok(USER_CONFIG.HUOBI_SECRET_KEY);
    assert.ok(USER_CONFIG.HUOBI_ACCOUNT_ID);

    const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(
      pairInfo,
      price,
      quantity,
      sell,
    );

    const path = '/v1/order/orders/place';
    const params: { [key: string]: string } = {
      'account-id': USER_CONFIG.HUOBI_ACCOUNT_ID!.toString(),
      amount: quantityStr,
      price: priceStr,
      symbol: pairInfo.raw_pair,
      type: sell ? 'sell-limit' : 'buy-limit',
    };
    if (clientOrderId) {
      params['client-order-id'] = clientOrderId;
    }

    const fullUrl = signRequest('POST', path, params);

    const response = await Axios.post(fullUrl, params, {
      headers: { 'Content-Type': 'application/json' },
    }).catch((e: Error) => {
      return e;
    });
    if (response instanceof Error) return response;
    assert.equal(response.status, 200);
    assert.equal(response.data.status, 'ok');
    return response.data.data as string;
  } catch (e) {
    return e;
  }
}

export async function cancelOrder(pairInfo: PairInfo, orderId: string): Promise<boolean> {
  assert.ok(pairInfo);

  const path = `/v1/order/orders/${orderId}/submitcancel`;

  const params = {};
  const fullUrl = signRequest('POST', path, params);

  const response = await Axios.post(fullUrl, params, {
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');
  return (response.data.data as string) === orderId;
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const path = `/v1/order/orders/${orderId}`;

  const fullUrl = signRequest('GET', path);
  const response = await Axios.get(fullUrl, { headers: { 'Content-Type': 'application/json' } });
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');
  return response.data.data;
}

export async function queryAccounts(): Promise<
  {
    id: number;
    type: 'spot' | 'margin' | 'otc' | 'point' | 'super-margin';
    subtype: string;
    state: 'working' | 'lock';
  }[]
> {
  const path = '/v1/account/accounts';
  const fullUrl = signRequest('GET', path);
  const response = await Axios.get(fullUrl, { headers: { 'Content-Type': 'application/json' } });
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');
  return response.data.data;
}

interface ReferenceCurrency {
  currency: string;
  instStatus: 'normal' | 'delisted';
  chains: {
    chain: string;
    baseChain?: string;
    baseChainProtocol?: string;
    isDynamic: boolean;
    depositStatus: 'allowed' | 'prohibited';
    maxTransactFeeWithdraw: string;
    maxWithdrawAmt: string;
    minDepositAmt: string;
    minWithdrawAmt: string;
    numOfConfirmations: number;
    numOfFastConfirmations: 999;
    withdrawFeeType: 'fixed' | 'circulated';
    transactFeeWithdraw?: string;
    minTransactFeeWithdraw?: string;
    withdrawPrecision: 5;
    withdrawQuotaPerDay: string;
    withdrawQuotaPerYear: string;
    withdrawQuotaTotal: string;
    withdrawStatus: 'allowed' | 'prohibited';
  }[];
}

export async function queryAllBalances(all: boolean = false): Promise<{ [key: string]: number }> {
  const path = `/v1/account/accounts/${USER_CONFIG.HUOBI_ACCOUNT_ID!}/balance`;
  const fullUrl = signRequest('GET', path);
  const response = await Axios.get(fullUrl, { headers: { 'Content-Type': 'application/json' } });
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');
  const data = response.data.data as {
    id: number;
    type: 'spot' | 'margin' | 'otc' | 'point' | 'super-margin';
    state: 'working' | 'lock';
    list: { currency: string; type: 'trade' | 'frozen'; balance: string }[];
  };
  assert.equal(data.id, USER_CONFIG.HUOBI_ACCOUNT_ID);
  assert.equal(data.type, 'spot');
  assert.equal(data.state, 'working');

  const result: { [key: string]: number } = {};
  data.list
    .filter(x => !all && x.type === 'trade')
    .forEach(x => {
      result[normalizeSymbol(x.currency, 'Huobi')] = parseFloat(x.balance);
    });
  return result;
}

async function getReferenceCurrencies(): Promise<ReferenceCurrency[]> {
  const path = '/v2/reference/currencies';

  const response = await Axios.get(`${API_ENDPOINT}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  assert.equal(response.status, 200);
  assert.equal(response.data.code, 200);

  return response.data.data;
}

export async function fetchCurrencyList(): Promise<string[] | Error> {
  const path = '/v1/common/currencys';

  const response = await Axios.get(`${API_ENDPOINT}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  }).catch((e: Error) => {
    return e;
  });
  if (response instanceof Error) return response;

  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'ok');

  return response.data.data as string[];
}

// TODO: work in progress
export async function getDepositAddresses(): Promise<{
  [key: string]: { [key: string]: DepositAddress };
}> {
  const result: { [key: string]: { [key: string]: DepositAddress } } = {};

  const currencyList = await fetchCurrencyList();
  if (currencyList instanceof Error) return result;

  const path = '/v2/account/deposit/address';
  const requests = currencyList
    .map(currency => signRequest('GET', `${path}?currency=${currency}`))
    .map(fullUrl => Axios.get(fullUrl, { headers: { 'Content-Type': 'application/json' } }));

  const responses = await Promise.all(requests);
  responses.forEach(response => {
    assert.equal(response.status, 200);
    console.info(response.data);
    assert.equal(response.data.status, 'ok');
  });

  const arr = responses.map(response => response.data.data);
  console.info(arr);

  return result;
}

export async function getWithdrawalFees(): Promise<{
  [key: string]: { [key: string]: WithdrawalFee };
}> {
  const arr = await getReferenceCurrencies();

  const result: { [key: string]: { [key: string]: WithdrawalFee } } = {};
  arr
    .filter(x => x.chains.length > 0)
    .forEach(x => {
      const symbol = normalizeSymbol(x.currency, 'Huobi');
      if (!(symbol in result)) result[symbol] = {};

      x.chains.forEach(y => {
        const platform = y.baseChainProtocol || symbol;

        result[symbol][platform] = {
          symbol,
          platform,
          fee: parseFloat(y.transactFeeWithdraw || y.minTransactFeeWithdraw || '0.0'),
          min: parseFloat(y.minWithdrawAmt),
        };
      });
    });
  return result;
}

export async function fetchCurrencies(): Promise<{
  [key: string]: Currency;
}> {
  const arr = await getReferenceCurrencies();

  const result: { [key: string]: Currency } = {};
  arr
    .filter(x => x.chains.length > 0)
    .forEach(x => {
      const trading = x.instStatus === 'normal';
      const symbol = normalizeSymbol(x.currency, 'Huobi');
      result[symbol] = { symbol, trading, deposit: {}, withdrawal: {} };

      x.chains.forEach(y => {
        const platform = y.baseChainProtocol || symbol;

        result[symbol].deposit[platform] = {
          platform,
          enabled: y.depositStatus === 'allowed',
          min: parseFloat(y.minDepositAmt),
        };
        result[symbol].withdrawal[platform] = {
          platform,
          enabled: y.withdrawStatus === 'allowed',
          fee: parseFloat(y.transactFeeWithdraw || y.minTransactFeeWithdraw || '0.0'),
          min: parseFloat(y.minWithdrawAmt),
        };
      });
    });
  return result;
}

export async function fetchCurrencyStatuses(): Promise<{ [key: string]: CurrencyStatus }> {
  const arr = await getReferenceCurrencies();

  const result: { [key: string]: CurrencyStatus } = {};

  arr
    .filter(x => x.chains.length > 0)
    .forEach(x => {
      const trading = x.instStatus === 'normal';
      const symbol = normalizeSymbol(x.currency, 'Huobi');
      if (!(symbol in result)) {
        result[symbol] = { symbol, deposit_enabled: {}, withdrawal_enabled: {}, trading };
      }

      x.chains.forEach(y => {
        const platform = y.baseChainProtocol || symbol;

        result[symbol].deposit_enabled[platform] = y.depositStatus === 'allowed';
        result[symbol].withdrawal_enabled[platform] = y.withdrawStatus === 'allowed';
      });
    });

  return result;
}

async function getChainInfo(): Promise<{
  [key: string]: {
    [key: string]: {
      currency: string;
      chain: string;
      baseChain?: string;
      baseChainProtocol?: string;
      fee: string;
      min: number;
      withdrawPrecision: number;
      withdrawal_enabled: boolean;
    };
  };
}> {
  const arr = await getReferenceCurrencies();

  const result: {
    [key: string]: {
      [key: string]: {
        currency: string;
        chain: string;
        baseChain?: string;
        baseChainProtocol?: string;
        fee: string;
        min: number;
        withdrawPrecision: number;
        withdrawal_enabled: boolean;
      };
    };
  } = {};

  arr
    .filter(x => x.chains.length > 0)
    .forEach(x => {
      const symbol = normalizeSymbol(x.currency, 'Huobi');
      if (!(symbol in result)) result[symbol] = {};

      x.chains.forEach(y => {
        const platform = y.baseChainProtocol || symbol;

        result[symbol][platform] = {
          currency: x.currency,
          chain: y.chain,
          baseChain: y.baseChain,
          baseChainProtocol: y.baseChainProtocol,
          fee: y.transactFeeWithdraw || y.minTransactFeeWithdraw || '0.0',
          min: parseFloat(y.minWithdrawAmt),
          withdrawPrecision: y.withdrawPrecision,
          withdrawal_enabled: y.withdrawStatus === 'allowed',
        };
      });
    });

  return result;
}

export async function withdraw(
  symbol: string,
  address: string, // only supports existing addresses in your withdrawal address list
  amount: number,
  memo?: string,
  platform?: string,
): Promise<string | Error> {
  const path = '/v1/dw/withdraw/api/create';
  if (platform === undefined) platform = symbol; // eslint-disable-line no-param-reassign

  const chainInfoMap = await getChainInfo();
  if (!(symbol in chainInfoMap)) {
    return new Error(`${symbol} is not in chainInfoMap`);
  }
  if (!(platform! in chainInfoMap[symbol])) {
    return new Error(`${platform} is not in chainInfoMap[${symbol}]`);
  }

  const chainInfo = chainInfoMap[symbol][platform!];
  if (!chainInfo.withdrawal_enabled) return new Error(`Huobi ${symbol} withdrawal is disabled now`);
  if (amount < chainInfo.min)
    return new Error(
      `The withdrawal amount ${amount} is less than Huobi ${symbol} minWithdrawAmt ${chainInfo.min}`,
    );

  const params: {
    address: string;
    currency: string;
    amount: string;
    fee: string;
    chain?: string;
    'addr-tag'?: string;
  } = {
    address,
    currency: chainInfo.currency,
    amount: numberToString(amount, chainInfo.withdrawPrecision, false),
    fee: chainInfo.fee,
    chain: chainInfo.chain,
  };
  if (memo) params['addr-tag'] = memo;

  const fullUrl = signRequest('POST', path, params);

  const response = await Axios.post(fullUrl, params, {
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(response.status, 200);

  if (response.data.data === null) return new Error(JSON.stringify(response.data));
  return response.data.data.toString();
}
