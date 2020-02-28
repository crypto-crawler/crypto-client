import { strict as assert } from 'assert';
import Axios from 'axios';
import { normalizeSymbol } from 'crypto-pair';
import { getTokenInfo } from 'eos-token-info';
import {
  createTransferAction,
  EOS_API_ENDPOINTS,
  getCurrencyBalance,
  getTableRows,
  sendTransaction,
  transfer,
} from 'eos-utils';
import { Serialize } from 'eosjs';
import { PairInfo } from 'exchange-info';
import https from 'https';
import { Bloks } from '../blockchain';
import { USER_CONFIG } from '../config';
import { ActionExtended, DepositAddress, NewdexOrder, WithdrawalFee } from '../pojo';
import { convertPriceAndQuantityToStrings, numberToString } from '../util';

const promiseAny = require('promise.any');

export function createOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
): ActionExtended {
  assert.ok(pairInfo);
  assert.ok(USER_CONFIG.eosAccount);

  const [priceStr, quantityStr, quoteQuantityStr] = convertPriceAndQuantityToStrings(
    pairInfo,
    price,
    quantity,
    sell,
  );

  const memo: NewdexOrder = {
    type: sell ? 'sell-limit' : 'buy-limit',
    symbol: pairInfo.pair_symbol,
    price: priceStr,
    channel: 'dapp',
    ref: 'coinrace.com',
  };

  let baseSymbol = pairInfo.normalized_pair.split('_')[0];
  if (baseSymbol === 'MYKEY') {
    baseSymbol = 'KEY';
  }
  const quoteSymbol = pairInfo.normalized_pair.split('_')[1];
  assert.equal(baseSymbol, pairInfo.base_symbol.sym.split(',')[1]);
  assert.equal(quoteSymbol, pairInfo.quote_symbol.sym.split(',')[1]);

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
        quoteQuantityStr,
        JSON.stringify(memo),
      );

  return {
    exchange: 'Newdex',
    action,
  };
}

export async function placeOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<string | Error> {
  try {
    assert.ok(pairInfo);
    assert.ok(USER_CONFIG.eosAccount);
    assert.ok(USER_CONFIG.eosPrivateKey);

    const actionExt = createOrder(pairInfo, price, quantity, sell);
    const response = await sendTransaction([actionExt.action], USER_CONFIG.eosPrivateKey!).catch(
      (e: Error) => {
        return e;
      },
    );
    if (response instanceof Error) return response;
    return response.transaction_id || response.id;
  } catch (e) {
    return e;
  }
}

export async function cancelOrder(
  pairInfo: PairInfo,
  transactionId: string,
): Promise<boolean | string> {
  assert.ok(pairInfo);
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
  return response.transaction_id || response.id;
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
  pairInfo: PairInfo,
  transactionId: string,
): Promise<{ [key: string]: any } | undefined> {
  const orderId = await Bloks.getOrderId(transactionId);
  let response = await promiseAny(
    EOS_API_ENDPOINTS.map(url =>
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
      EOS_API_ENDPOINTS.map(url =>
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
  const sell = order.type === 2; // 1 buy, 2 sell

  assert.equal(order.owner, USER_CONFIG.eosAccount!);

  assert.equal(
    order.contract,
    sell ? pairInfo.base_symbol.contract : pairInfo.quote_symbol.contract,
  );
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
  arr.forEach(x => {
    const symbol = normalizeSymbol(x.currency, 'Newdex');
    result[symbol] = x.amount;
  });

  result.EOS = await promiseAny(
    EOS_API_ENDPOINTS.map(url => getCurrencyBalance(USER_CONFIG.eosAccount!, 'EOS', url)),
  );
  return result;
}

export async function queryBalance(symbol: string): Promise<number> {
  return promiseAny(
    EOS_API_ENDPOINTS.map(url => getCurrencyBalance(USER_CONFIG.eosAccount!, symbol, url)),
  );
}

export function getDepositAddresses(
  symbols: string[],
): { [key: string]: { [key: string]: DepositAddress } } {
  const result: { [key: string]: { [key: string]: DepositAddress } } = {};

  symbols.forEach(symbol => {
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

  symbols.forEach(symbol => {
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
