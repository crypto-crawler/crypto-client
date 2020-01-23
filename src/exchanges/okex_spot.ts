import { AuthenticatedClient } from '@okfe/okex-node';
import { strict as assert } from 'assert';
import { ExchangeInfo, PairInfo } from 'exchange-info';
import { getWithdrawalFee } from 'okex-withdrawal-fee';
import { USER_CONFIG } from '../config';
import { DepositAddress, SubType } from '../pojo/deposit_address';
import { WithdrawalFee } from '../pojo/withdrawal_fee';
import { convertPriceAndQuantityToStrings } from '../util';

function createAuthenticatedClient(): any {
  assert.ok(USER_CONFIG.OKEX_SPOT_API_KEY);
  assert.ok(USER_CONFIG.OKEX_SPOT_API_SECRET);
  assert.ok(USER_CONFIG.OKEX_SPOT_API_PASSPHRASE);

  const authClient = AuthenticatedClient(
    USER_CONFIG.OKEX_SPOT_API_KEY!,
    USER_CONFIG.OKEX_SPOT_API_SECRET!,
    USER_CONFIG.OKEX_SPOT_API_PASSPHRASE!,
    'https://www.okex.com',
    6000,
  );
  return authClient;
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

  const params: { [key: string]: string } = {
    type: 'limit',
    side: sell ? 'sell' : 'buy',
    instrument_id: pairInfo.raw_pair,
    price: priceStr,
    size: quantityStr,
  };
  if (clientOrderId) {
    params.client_oid = clientOrderId;
  }

  const authClient = createAuthenticatedClient();
  const data = await authClient.spot().postOrder(params);
  if (data.error_code) throw new Error(data.error_message);

  return data.order_id;
}

export async function cancelOrder(
  pairInfo: PairInfo,
  orderId: string,
  clientOrderId?: string,
): Promise<boolean> {
  assert.ok(pairInfo);

  const params: { [key: string]: string } = {
    instrument_id: pairInfo.raw_pair,
  };
  if (clientOrderId) {
    params.client_oid = clientOrderId;
  }

  const authClient = createAuthenticatedClient();
  const data = await authClient.spot().postCancelOrder(clientOrderId || orderId, params);
  return data.result;
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
  clientOrderId?: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const params = {
    instrument_id: pairInfo.raw_pair,
  };

  const authClient = createAuthenticatedClient();
  const data = await authClient.spot().getOrder(clientOrderId || orderId, params);
  return data;
}

export async function queryAllBalances(): Promise<{ [key: string]: number }> {
  const authClient = createAuthenticatedClient();
  const arr = (await authClient.spot().getAccounts()) as {
    id: string;
    currency: string;
    balance: string;
    available: string;
    frozen: string;
    hold: string;
    holds: string;
  }[];

  const result: { [key: string]: number } = {};
  arr.forEach(x => {
    result[x.currency] = parseFloat(x.available);
  });
  return result;
}

export async function queryBalance(symbol: string): Promise<number> {
  const authClient = createAuthenticatedClient();
  const data = (await authClient.spot().getAccounts(symbol)) as {
    id: string;
    currency: string;
    balance: string;
    available: string;
    frozen: string;
    hold: string;
    holds: string;
  };

  return parseFloat(data.available);
}

export async function getWithdrawalFees(
  symbols: string[],
): Promise<{ [key: string]: WithdrawalFee[] }> {
  if (symbols.includes('USDT')) {
    symbols = [...symbols]; // eslint-disable-line no-param-reassign
    symbols.splice(symbols.indexOf('USDT'), 1); // remove USDT
    symbols.push('USDT-OMNI', 'USDT-ERC20', 'USDT-TRC20');
  }

  const result: { [key: string]: WithdrawalFee[] } = {};

  const authClient = createAuthenticatedClient();
  const arr = (await authClient.account().getWithdrawalFee()) as Array<{
    min_fee: string;
    currency: string;
    max_fee: string;
  }>;

  // console.info(JSON.stringify(arr, undefined, 2));

  // Rename USDT to USDT-OMNI
  arr
    .filter(x => x.currency === 'USDT')
    .forEach(x => {
      x.currency = 'USDT-OMNI'; // eslint-disable-line no-param-reassign
    });

  arr
    .filter(x => x.min_fee && symbols.includes(x.currency))
    .forEach(x => {
      let symbol: string;
      let subtype: string | undefined;

      if (x.currency.includes('-')) {
        const [symbol_, subtype_] = x.currency.split('-');
        symbol = symbol_;
        subtype = subtype_;
      } else {
        symbol = x.currency;
      }

      const withdrawalFee = getWithdrawalFee(symbol, subtype)!;
      assert.equal(parseFloat(x.min_fee), withdrawalFee.withdrawal_fee);

      const fee: WithdrawalFee = {
        symbol,
        deposit_enabled: true,
        withdraw_enabled: true,
        withdrawal_fee: parseFloat(x.min_fee),
        min_withdraw_amount: withdrawalFee.min_withdraw_amount,
      };
      if (subtype) fee.subtype = subtype as SubType;

      if (!(symbol in result)) {
        result[symbol] = [];
      }
      result[symbol].push(fee);
    });

  return result;
}

export async function getDepositAddresses(
  symbols: string[],
  exchangeInfo: ExchangeInfo,
): Promise<{ [key: string]: DepositAddress[] }> {
  const result: { [key: string]: DepositAddress[] } = {};

  const allSymbols = new Set(Object.keys(exchangeInfo.pairs).flatMap(pair => pair.split('_')));

  const authClient = createAuthenticatedClient();

  const requests = symbols
    .filter(symbol => allSymbols.has(symbol))
    .map(symbol => authClient.account().getAddress(symbol));

  const arr = ((await Promise.all(requests)) as {
    address: string;
    currency: string;
    to: number;
    memo?: string;
    tag?: string;
  }[][]).flatMap(x => x);

  // Rename USDT to USDT-OMNI
  arr
    .filter(x => x.currency.toUpperCase() === 'USDT')
    .forEach(x => {
      x.currency = 'USDT-OMNI'; // eslint-disable-line no-param-reassign
    });

  // console.info(arr);

  arr
    .filter(x => x.to === 1) // 1, spot; 6, fund
    .forEach(x => {
      let symbol: string;
      let subtype: string | undefined;

      if (x.currency.includes('-')) {
        const [symbol_, subtype_] = x.currency.split('-');
        symbol = symbol_.toUpperCase();
        subtype = subtype_.toUpperCase();
      } else {
        symbol = x.currency.toUpperCase();
      }

      const depositAddress: DepositAddress = {
        symbol,
        address: x.address,
        memo: x.memo || x.tag,
      };
      if (subtype) depositAddress.subtype = subtype as SubType;

      if (!(symbol in result)) {
        result[symbol] = [];
      }
      result[symbol].push(depositAddress);
    });

  return result;
}
