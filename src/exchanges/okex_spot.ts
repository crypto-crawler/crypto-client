import { AuthenticatedClient } from '@okfe/okex-node';
import { strict as assert } from 'assert';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { CurrencyStatus, WithdrawalFee } from '../pojo';
import { Currency } from '../pojo/currency';
import { DepositAddress } from '../pojo/deposit_address';
import { calcTokenPlatform, convertPriceAndQuantityToStrings, detectPlatform } from '../util';

function createAuthenticatedClient(): any {
  assert.ok(USER_CONFIG.OKEX_SPOT_API_KEY);
  assert.ok(USER_CONFIG.OKEX_SPOT_API_SECRET);
  assert.ok(USER_CONFIG.OKEX_SPOT_API_PASSPHRASE);

  const authClient = AuthenticatedClient(
    USER_CONFIG.OKEX_SPOT_API_KEY!,
    USER_CONFIG.OKEX_SPOT_API_SECRET!,
    USER_CONFIG.OKEX_SPOT_API_PASSPHRASE!,
  );
  return authClient;
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
    const data = await authClient
      .spot()
      .postOrder(params)
      .catch((e: Error) => {
        return e;
      });
    if (data instanceof Error) return data;

    if (data.error_code) throw new Error(data.error_message);

    return data.order_id;
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
    platform = symbol;
  }

  return [symbol, platform];
}

async function getAddressWithTryCatch(
  authClient: any,
  symbol: string,
): Promise<
  | {
      address: string;
      currency: string;
      to: number;
      memo?: string;
      tag?: string;
    }[]
  | Error
> {
  try {
    return await authClient.account().getAddress(symbol);
  } catch (e) {
    return e;
  }
}

export async function getDepositAddresses(
  symbols: string[],
  all: boolean = false,
): Promise<{ [key: string]: { [key: string]: DepositAddress } }> {
  if (!symbols.includes('ETH')) symbols.push('ETH');
  if (!symbols.includes('TRX')) symbols.push('TRX');

  const result: { [key: string]: { [key: string]: DepositAddress } } = {};

  const authClient = createAuthenticatedClient();
  const requests = symbols.map(symbol => getAddressWithTryCatch(authClient, symbol));

  const arr = (await Promise.all(requests))
    .filter(x => !(x instanceof Error))
    .flatMap(
      x =>
        x as {
          address: string;
          currency: string;
          to: number;
          memo?: string;
          tag?: string;
        }[],
    );

  const ethAddresses = arr.filter(x => x.currency.toUpperCase() === 'ETH').map(x => x.address);
  assert.ok(ethAddresses.length > 0);
  const trxAddresses = arr.filter(x => x.currency.toUpperCase() === 'TRX').map(x => x.address);
  assert.ok(trxAddresses.length > 0);

  // Rename USDT to USDT-OMNI
  arr
    .filter(x => x.currency.toUpperCase() === 'USDT')
    .forEach(x => {
      x.currency = 'USDT-OMNI'; // eslint-disable-line no-param-reassign
    });

  // console.info(arr);

  arr
    .filter(x => all || x.to === 1) // 1, spot; 6, fund
    .forEach(x => {
      const [symbol, platformTmp] = parseCurrency(x.currency);
      if (!(symbol in result)) result[symbol] = {};

      let platform = platformTmp;
      if (ethAddresses.includes(x.address) && symbol !== 'ETH' && symbol !== 'ETC') {
        platform = 'ERC20';
        assert.equal(platform, detectPlatform(x.address, symbol));
      }
      if (trxAddresses.includes(x.address) && symbol !== 'TRX') {
        platform = 'TRC20';
        assert.equal(platform, detectPlatform(x.address, symbol));
      }

      const depositAddress: DepositAddress = {
        symbol,
        platform,
        address: x.address,
      };
      if (x.memo || x.tag) depositAddress.memo = x.memo || x.tag;

      result[symbol][platform] = depositAddress;
    });

  return result;
}

export async function getWithdrawalFees(): Promise<{
  [key: string]: { [key: string]: WithdrawalFee };
}> {
  const result: { [key: string]: { [key: string]: WithdrawalFee } } = {};

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

  const depositAddresses = await getDepositAddresses(
    withdrawalFees.filter(x => x.min_fee).map(x => parseCurrency(x.currency)[0]),
    true,
  );
  const tokenPlatformMap = calcTokenPlatform(depositAddresses);

  // console.info(withdrawalFees.filter(x => x.currency.includes('-')).map(x => x.currency));
  withdrawalFees
    .filter(x => x.min_fee)
    .forEach(x => {
      const symbol = parseCurrency(x.currency)[0];
      const platform = tokenPlatformMap[symbol] || parseCurrency(x.currency)[1];

      if (!(symbol in result)) result[symbol] = {};

      result[symbol][platform] = {
        symbol,
        platform,
        fee: parseFloat(x.min_fee),
        min:
          x.currency in currencyMap && 'min_withdraw_amount' in currencyMap[x.currency]
            ? currencyMap[x.currency].min_withdraw_amount!
            : 0.0,
      };
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

  // console.info(withdrawalFees.filter(x => x.currency.includes('-')).map(x => x.currency));
  withdrawalFees
    .filter(x => x.min_fee)
    .forEach(x => {
      const [symbol, platform] = parseCurrency(x.currency);

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
        min:
          x.currency in currencyMap && 'min_withdraw_amount' in currencyMap[x.currency]
            ? currencyMap[x.currency].min_withdraw_amount!
            : 0.0,
      };

      result[symbol] = currency;
    });

  const requests = Object.keys(result).map(symbol => getAddressWithTryCatch(authClient, symbol));
  const depositAddresses = (await Promise.all(requests))
    .filter(x => !(x instanceof Error))
    .flatMap(
      x =>
        x as {
          address: string;
          currency: string;
          to: number;
          memo?: string;
          tag?: string;
        }[],
    );

  depositAddresses.forEach(x => {
    x.currency = x.currency.toUpperCase(); // eslint-disable-line no-param-reassign
  });
  // Rename USDT to USDT-OMNI
  depositAddresses
    .filter(x => x.currency === 'USDT')
    .forEach(x => {
      x.currency = 'USDT-OMNI'; // eslint-disable-line no-param-reassign
    });

  // console.info(depositAddresses);
  // console.info(depositAddresses.filter(x => x.currency.includes('-')).map(x => x.currency));

  depositAddresses.forEach(x => {
    const [symbol, platform] = parseCurrency(x.currency);

    const currency = result[symbol];
    assert.ok(currency);

    if (platform in currency.deposit) {
      if (x.currency in currencyMap) {
        // if (!currencyMap[x.currency].can_deposit) console.error(x);
        // Exception: ACE can_deposit is false but it is in depositAddresses
        // assert.ok(currencyMap[x.currency].can_deposit);
      } else {
        currency.deposit[platform].enabled = true;
      }
    } else {
      currency.deposit[platform] = {
        platform,
        enabled: true,
      };
    }
  });
  return result;
}

export async function fetchCurrencyStatuses(): Promise<{ [key: string]: CurrencyStatus }> {
  const result: { [key: string]: CurrencyStatus } = {};

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

  currencies.forEach(x => {
    const [symbol, platform] = parseCurrency(x.currency);
    if (!(symbol in result)) {
      result[symbol] = { symbol, deposit_enabled: {}, withdrawal_enabled: {} };
    }

    result[symbol].deposit_enabled[platform] = x.can_deposit === '1';
    result[symbol].withdrawal_enabled[platform] = x.can_withdraw === '1';
  });
  return result;
}
