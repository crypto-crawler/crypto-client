import { strict as assert } from 'assert';
import { AuthenticatedClient, LimitOrder } from 'coinbase-pro';
import { Market } from 'crypto-markets';
import { USER_CONFIG } from '../config';
import { DepositAddress, WithdrawalFee } from '../pojo';
import { convertPriceAndQuantityToStrings, detectPlatform } from '../util';

function createAuthenticatedClient(): AuthenticatedClient {
  assert.ok(USER_CONFIG.COINBASE_ACCESS_KEY);
  assert.ok(USER_CONFIG.COINBASE_ACCESS_SECRET);
  assert.ok(USER_CONFIG.COINBASE_ACCESS_PASSPHRASE);

  return new AuthenticatedClient(
    USER_CONFIG.COINBASE_ACCESS_KEY!,
    USER_CONFIG.COINBASE_ACCESS_SECRET!,
    USER_CONFIG.COINBASE_ACCESS_PASSPHRASE!,
  );
}

export async function placeOrder(
  market: Market,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<string | Error> {
  try {
    assert.ok(market);

    const client = createAuthenticatedClient();

    const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(market, price, quantity, sell);

    const order: LimitOrder = {
      type: 'limit',
      side: sell ? 'sell' : 'buy',
      product_id: market.id,
      price: priceStr,
      size: quantityStr,
    };

    const orderResult = await client.placeOrder(order).catch((e: Error) => {
      return e;
    });

    if (orderResult instanceof Error) return orderResult;
    return orderResult.id;
  } catch (e) {
    return e;
  }
}

export async function cancelOrder(orderId: string): Promise<boolean> {
  const client = createAuthenticatedClient();

  const arr = await client.cancelOrder(orderId);

  return ((arr as unknown) as string) === orderId; // TODO: coinbase-pro need to fix its types
}

export async function queryOrder(orderId: string): Promise<{ [key: string]: any } | undefined> {
  const client = createAuthenticatedClient();

  try {
    const orderInfo = await client.getOrder(orderId);
    assert.equal(orderInfo.id, orderId);

    return orderInfo;
  } catch (e) {
    if (e?.response?.statusCode === 404) {
      return undefined; // orderId not exist
    }
    throw e;
  }
}

export async function queryAllBalances(all = false): Promise<{ [key: string]: number } | Error> {
  const client = createAuthenticatedClient();

  const accounts = await client.getAccounts().catch((e: Error) => {
    return e;
  });
  if (accounts instanceof Error) return accounts;

  const result: { [key: string]: number } = {};

  accounts.forEach((account) => {
    result[account.currency] = parseFloat(all ? account.balance : account.available);
  });

  return result;
}

export async function getDepositAddresses(
  symbols: string[],
): Promise<{ [key: string]: { [key: string]: DepositAddress } }> {
  assert.ok(symbols.length);

  const client = createAuthenticatedClient();

  const result: { [key: string]: { [key: string]: DepositAddress } } = {};

  for (let i = 0; i < symbols.length; i += 1) {
    const symbol = symbols[i];

    try {
      if (!(symbol in result)) result[symbol] = {};

      // eslint-disable-next-line no-await-in-loop
      const data = await (client as any).depositCrypto({ currency: symbol }).catch((e: Error) => {
        return e;
      });
      if (data instanceof Error) return result;

      const { address_info } = data as {
        address_info: { address: string; destination_tag?: string };
      };

      const platform = detectPlatform(address_info.address, symbol) || symbol;

      result[symbol][platform] = {
        symbol,
        platform,
        address: address_info.address,
      };
      if (address_info.destination_tag) result[symbol][symbol].memo = address_info.destination_tag;
    } catch (e) {
      // console.error(e);
    }
  }

  return result;
}

export function getWithdrawalFees(): { [key: string]: { [key: string]: WithdrawalFee } } {
  // https://help.coinbase.com/en/pro/trading-and-funding/trading-rules-and-fees/fees.html
  const data: { [key: string]: number } = {
    EUR: 0.15,
    USD: 25,
  };
  const result: { [key: string]: { [key: string]: WithdrawalFee } } = {};

  Object.keys(data).forEach((symbol) => {
    const fee = data[symbol] || 0;

    result[symbol] = {};
    result[symbol][symbol] = {
      symbol,
      platform: symbol,
      fee,
      min: 0,
    };
  });

  return result;
}

export async function withdraw(
  symbol: string,
  address: string, // only supports existing addresses in your withdrawal address list
  amount: number,
  memo?: string,
): Promise<string | Error> {
  const client = createAuthenticatedClient();

  const minWithdrawalAmount: { [key: string]: number } = { EOS: 1.0 };
  if (symbol in minWithdrawalAmount && amount < minWithdrawalAmount[symbol]) {
    return new Error(
      `${symbol} withdrawal amount ${amount} is less than Coinbase minimum amunt ${minWithdrawalAmount[symbol]}`,
    );
  }

  const params: {
    currency: string;
    crypto_address: string;
    amount: number;
    destination_tag?: string;
  } = {
    currency: symbol,
    crypto_address: address,
    amount,
  };
  if (memo) params.destination_tag = memo;

  const data = await (client as any).withdrawCrypto(params).catch((e: Error) => {
    return e;
  });
  if (data instanceof Error) return data;

  const { id } = data as {
    id: string;
    amount: string;
    currency: string;
  };
  return id;
}
