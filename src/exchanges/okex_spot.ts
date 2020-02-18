import { AuthenticatedClient } from '@okfe/okex-node';
import { strict as assert } from 'assert';
import { ExchangeInfo, PairInfo } from 'exchange-info';
import { getWithdrawalFee } from 'okex-withdrawal-fee';
import { USER_CONFIG } from '../config';
import { Currency } from '../pojo/currency';
import { DepositAddress } from '../pojo/deposit_address';
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

export async function queryAllBalances(all: boolean = false): Promise<{ [key: string]: number }> {
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
    result[x.currency] = all ? parseFloat(x.balance) : parseFloat(x.available);
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

function parseCurrency(currency: string): [string, string] {
  currency = currency.toUpperCase(); // eslint-disable-line no-param-reassign
  let symbol: string;
  let platform: string;

  if (currency.includes('-')) {
    const [symbol_, platform_] = currency.split('-');
    symbol = symbol_;
    platform = platform_;
  } else {
    symbol = currency;
    platform = currency;
  }
  return [symbol, platform];
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
      const [symbol, platform] = parseCurrency(x.currency);

      const depositAddress: DepositAddress = {
        symbol,
        platform,
        address: x.address,
      };
      if (x.memo || x.tag) depositAddress.memo = x.memo || x.tag;

      if (!(symbol in result)) {
        result[symbol] = [];
      }
      result[symbol].push(depositAddress);
    });

  return result;
}

export async function fetchCurrencies(): Promise<{ [key: string]: Currency }> {
  const result: { [key: string]: Currency } = {};

  const authClient = createAuthenticatedClient();

  const currencies = (await await authClient.account().getCurrencies()) as ReadonlyArray<{
    name: string;
    currency: string;
    can_deposit: '0' | '1';
    can_withdraw: '0' | '1';
    min_withdrawal?: string;
  }>;
  // Rename USDT to USDT-OMNI
  currencies
    .filter(x => x.currency === 'USDT')
    .forEach(x => {
      x.currency = 'USDT-OMNI'; // eslint-disable-line no-param-reassign
    });
  // console.info(JSON.stringify(currencies, undefined, 2));

  // Usded for validation
  const currencyMap: {
    [key: string]: {
      symbol: string;
      can_deposit: boolean;
      can_withdraw: boolean;
      min_withdraw_amount?: number;
    };
  } = {};
  currencies.forEach(x => {
    currencyMap[x.currency] = {
      symbol: x.currency,
      can_deposit: x.can_deposit === '1',
      can_withdraw: x.can_withdraw === '1',
    };
    if (x.min_withdrawal) {
      currencyMap[x.currency].min_withdraw_amount = parseFloat(x.min_withdrawal);
    }
  });

  const withdrawalFees = (await authClient.account().getWithdrawalFee()) as ReadonlyArray<{
    min_fee: string;
    currency: string;
    max_fee: string;
  }>;

  // console.info(JSON.stringify(withdrawalFees, undefined, 2));

  // Rename USDT to USDT-OMNI
  withdrawalFees
    .filter(x => x.currency === 'USDT')
    .forEach(x => {
      x.currency = 'USDT-OMNI'; // eslint-disable-line no-param-reassign
    });

  withdrawalFees
    .filter(x => x.min_fee)
    .forEach(x => {
      const [symbol, platform] = parseCurrency(x.currency);

      const withdrawalFee = getWithdrawalFee(
        symbol,
        x.currency.includes('-') ? platform : undefined,
      )!;
      assert.ok(withdrawalFee);
      assert.equal(parseFloat(x.min_fee), withdrawalFee.withdrawal_fee);

      // Some coins like USDT-TRC20 don't have min_withdraw_amount in getCurrencies()
      if (x.currency in currencyMap && 'min_withdraw_amount' in currencyMap[x.currency]) {
        assert.equal(
          withdrawalFee.min_withdraw_amount,
          currencyMap[x.currency].min_withdraw_amount,
        );
        assert.ok(currencyMap[x.currency].can_withdraw);
      }

      const currency: Currency = result[symbol] || {
        symbol,
        trading: true,
        deposit: {},
        withdrawal: {},
      };

      currency.deposit[platform] = {
        platform,
        enabled: x.currency in currencyMap ? currencyMap[x.currency].can_deposit : false,
      };

      currency.withdrawal[platform] = {
        platform,
        enabled: true,
        fee: parseFloat(x.min_fee),
        min: withdrawalFee.min_withdraw_amount,
      };

      result[symbol] = currency;
    });

  const requests = Object.keys(result).map(symbol => authClient.account().getAddress(symbol));
  const depositAddresses = ((await Promise.all(requests)) as {
    address: string;
    currency: string;
    to: number;
    memo?: string;
    tag?: string;
  }[][]).flatMap(x => x);

  // Rename USDT to USDT-OMNI
  depositAddresses
    .filter(x => x.currency.toUpperCase() === 'USDT')
    .forEach(x => {
      x.currency = 'USDT-OMNI'; // eslint-disable-line no-param-reassign
    });

  // console.info(depositAddresses);

  depositAddresses.forEach(x => {
    const [symbol, platform] = parseCurrency(x.currency);

    const currency = result[symbol];
    assert.ok(currency);

    if (platform in currency.deposit) {
      if (x.currency in currencyMap) {
        assert.ok(currencyMap[x.currency].can_deposit);
      }
    }

    currency.deposit[platform] = {
      platform,
      enabled: true,
    };
  });
  return result;
}
