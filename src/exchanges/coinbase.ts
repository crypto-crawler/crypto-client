import { strict as assert } from 'assert';
import { AuthenticatedClient, LimitOrder } from 'coinbase-pro';
import { PairInfo } from 'exchange-info';
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
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<string | Error> {
  try {
    assert.ok(pairInfo);

    const client = createAuthenticatedClient();

    const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(
      pairInfo,
      price,
      quantity,
      sell,
    );

    const order: LimitOrder = {
      type: 'limit',
      side: sell ? 'sell' : 'buy',
      product_id: pairInfo.raw_pair,
      price: priceStr,
      size: quantityStr,
    };

    const orderResult = await client.placeOrder(order);
    return orderResult.id;
  } catch (e) {
    return e;
  }
}

export async function cancelOrder(pairInfo: PairInfo, orderId: string): Promise<boolean> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  const arr = await client.cancelOrder(orderId);

  return ((arr as unknown) as string) === orderId; // TODO: coinbase-pro need to fix its types
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  try {
    const orderInfo = await client.getOrder(orderId);
    assert.equal(orderInfo.id, orderId);
    assert.equal(orderInfo.product_id, pairInfo.raw_pair);

    return orderInfo;
  } catch (e) {
    if (e?.response?.statusCode === 404) {
      return undefined; // orderId not exist
    }
    throw e;
  }
}

export async function queryAllBalances(all: boolean = false): Promise<{ [key: string]: number }> {
  const client = createAuthenticatedClient();

  const accounts = await client.getAccounts();

  const result: { [key: string]: number } = {};

  accounts.forEach(account => {
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
      const { address_info } = (await (client as any).depositCrypto({ currency: symbol })) as {
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
  const data: { [key: string]: number } = {
    EUR: 0.15,
    USD: 25,
  };
  const result: { [key: string]: { [key: string]: WithdrawalFee } } = {};

  Object.keys(data).forEach(symbol => {
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
