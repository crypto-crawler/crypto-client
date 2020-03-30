import { strict as assert } from 'assert';
import Axios from 'axios';
import { Market } from 'crypto-markets';
import { normalizeSymbol } from 'crypto-pair';
import { getTokenInfo } from 'eos-token-info';
import { EOS_API_ENDPOINTS, getTableRows } from 'eos-utils';
import { Serialize } from 'eosjs';
import https from 'https';
import { Bloks } from '../blockchain';
import { USER_CONFIG } from '../config';
import { ActionExtended, DepositAddress, NewdexOrder, WithdrawalFee } from '../pojo';
import { convertPriceAndQuantityToStrings, numberToString } from '../util';
import {
  createTransferAction,
  getCurrencyBalance,
  sendTransaction,
  transfer,
} from '../util/dfuse_eos';

const promiseAny = require('promise.any');

export function createOrder(
  market: Market,
  price: number,
  quantity: number,
  sell: boolean,
): ActionExtended {
  assert.ok(market);
  assert.ok(USER_CONFIG.eosAccount);

  const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(market, price, quantity, sell);

  const memo: NewdexOrder = {
    type: sell ? 'sell-limit' : 'buy-limit',
    symbol: market.id,
    price: priceStr,
    channel: 'dapp',
    ref: 'coinrace.com',
  };

  let baseSymbol = market.base;
  if (baseSymbol === 'MYKEY') {
    baseSymbol = 'KEY';
  }
  const quoteSymbol = market.quote;
  assert.equal(baseSymbol, market.info.base_symbol.sym.split(',')[1]);
  assert.equal(quoteSymbol, market.info.quote_symbol.sym.split(',')[1]);

  const quoteQuantity = numberToString(
    parseFloat(priceStr) * parseFloat(quantityStr),
    market.precision.quote!,
    !sell,
  );

  const action = sell
    ? createTransferAction(
        USER_CONFIG.eosAccount!,
        'newdexpublic',
        baseSymbol,
        quantityStr,
        JSON.stringify(memo),
      )
    : createTransferAction(
        USER_CONFIG.eosAccount!,
        'newdexpublic',
        quoteSymbol,
        quoteQuantity,
        JSON.stringify(memo),
      );

  return {
    exchange: 'Newdex',
    action,
  };
}

export async function placeOrder(
  market: Market,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<string | Error> {
  try {
    assert.ok(market);
    assert.ok(USER_CONFIG.eosAccount);
    assert.ok(USER_CONFIG.eosPrivateKey);

    const actionExt = createOrder(market, price, quantity, sell);
    const response = await sendTransaction([actionExt.action], USER_CONFIG.eosPrivateKey!).catch(
      (e: Error) => {
        return e;
      },
    );
    if (response instanceof Error) return response;
    return response.transaction_id;
  } catch (e) {
    return e;
  }
}

export async function cancelOrder(transactionId: string): Promise<boolean | string> {
  assert.ok(transactionId);
  assert.ok(USER_CONFIG.eosAccount);
  assert.ok(USER_CONFIG.eosPrivateKey);

  const orderId = await Bloks.getOrderId(transactionId);

  const action: Serialize.Action = {
    account: 'newdexpublic',
    name: 'cancelorder',
    authorization: [
      {
        actor: USER_CONFIG.eosAccount!,
        permission: 'active',
      },
    ],
    data: orderId,
  };

  const response = await sendTransaction([action], USER_CONFIG.eosPrivateKey!);
  if (response instanceof Error) return response.message;
  return true;
}

export interface NewdexOrderOnChain {
  order_id: number;
  pair_id: number;
  type: number;
  owner: string;
  placed_time: string;
  remain_quantity: string;
  remain_convert: string;
  price: string;
  contract: string;
  count: number;
}

export async function queryOrder(
  transactionId: string,
): Promise<{ [key: string]: any } | undefined> {
  const orderId = await Bloks.getOrderId(transactionId);
  let response = await promiseAny(
    EOS_API_ENDPOINTS.map((url) =>
      getTableRows(
        {
          code: 'newdexpublic',
          scope: '...........u1',
          table: 'sellorder',
          lower_bound: orderId.order_id,
          upper_bound: orderId.order_id + 1,
        },
        url,
      ),
    ),
  );
  if (response.rows.length === 0) {
    response = await promiseAny(
      EOS_API_ENDPOINTS.map((url) =>
        getTableRows(
          {
            code: 'newdexpublic',
            scope: '...........u1',
            table: 'buyorder',
            lower_bound: orderId.order_id,
            upper_bound: orderId.order_id + 1,
          },
          url,
        ),
      ),
    );
  }
  assert.equal(response.more, false);
  if (response.rows.length === 0) return undefined;
  assert.equal(response.rows.length, 1);

  const order = response.rows[0] as NewdexOrderOnChain;

  assert.equal(order.owner, USER_CONFIG.eosAccount!);
  return order;
}

export async function queryAllBalances(): Promise<{ [key: string]: number }> {
  const agent = new https.Agent({
    rejectUnauthorized: false,
  });
  const response = await Axios.get(
    'https://www.api.bloks.io/account/cryptoforest?type=getAccountTokens&coreSymbol=EOS',
    {
      httpsAgent: agent,
      timeout: 5000,
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        Origin: 'https://bloks.io',
        Referer: `https://bloks.io/account/${USER_CONFIG.eosAccount!}`,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 Safari/537.36',
      },
    },
  );
  assert.equal(response.status, 200);

  const arr = response.data.tokens as {
    key: string;
    currency: string;
    amount: number;
    contract: string;
    decimals: string;
    usd_value: number;
  }[];

  const result: { [key: string]: number } = {};
  arr.forEach((x) => {
    const symbol = normalizeSymbol(x.currency, 'Newdex');
    result[symbol] = x.amount;
  });

  result.EOS = await getCurrencyBalance(USER_CONFIG.eosAccount!, 'EOS');
  return result;
}

export async function queryBalance(symbol: string): Promise<number> {
  return getCurrencyBalance(USER_CONFIG.eosAccount!, symbol);
}

export function getDepositAddresses(
  symbols: string[],
): { [key: string]: { [key: string]: DepositAddress } } {
  const result: { [key: string]: { [key: string]: DepositAddress } } = {};

  symbols.forEach((symbol) => {
    if (getTokenInfo(symbol === 'MYKEY' ? 'KEY' : symbol) === undefined) return;

    result[symbol] = {};
    result[symbol].EOS = {
      symbol,
      platform: 'EOS',
      address: USER_CONFIG.eosAccount!,
    };
  });

  return result;
}

export function getWithdrawalFees(
  symbols: string[],
): { [key: string]: { [key: string]: WithdrawalFee } } {
  const result: { [key: string]: { [key: string]: WithdrawalFee } } = {};

  symbols.forEach((symbol) => {
    if (getTokenInfo(symbol === 'MYKEY' ? 'KEY' : symbol) === undefined) return;

    result[symbol] = {};
    result[symbol].EOS = {
      symbol,
      platform: 'EOS',
      fee: 0,
      min: 0,
    };
  });

  return result;
}

export async function withdraw(
  symbol: string,
  address: string, // only supports existing addresses in your withdrawal address list
  amount: number,
  platform: string,
  memo: string,
): Promise<string | Error> {
  assert.ok(memo);
  assert.equal(platform, 'EOS');

  const tokenInfo = getTokenInfo(symbol);
  if (tokenInfo === undefined) {
    return new Error(`getTokenInfo(${symbol}) failed`);
  }

  const response = await transfer(
    USER_CONFIG.eosAccount!,
    USER_CONFIG.eosPrivateKey!,
    address,
    symbol,
    numberToString(amount, tokenInfo.decimals, false),
    memo,
  ).catch((e: Error) => {
    return e;
  });

  if (response instanceof Error) return response;
  return response.transaction_id || response.id;
}
