import { strict as assert } from 'assert';
import createClient, { Binance } from 'binance-api-node';
import { Market } from 'crypto-markets';
import { USER_CONFIG } from '../config';
import { Currency, WithdrawalFee } from '../pojo';
import { DepositAddress } from '../pojo/deposit_address';
import { calcTokenPlatform, convertPriceAndQuantityToStrings, detectPlatform } from '../util';

function createAuthenticatedClient(): Binance {
  assert.ok(USER_CONFIG.BINANCE_API_KEY);
  assert.ok(USER_CONFIG.BINANCE_API_SECRET);

  return createClient({
    apiKey: USER_CONFIG.BINANCE_API_KEY!,
    apiSecret: USER_CONFIG.BINANCE_API_SECRET!,
  });
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

    const order = await client
      .order({
        symbol: market.id,
        type: 'LIMIT',
        side: sell ? 'SELL' : 'BUY',
        quantity: quantityStr,
        price: priceStr,
      })
      .catch((e: Error) => {
        return e;
      });

    if (order instanceof Error) return order;
    return order.orderId.toString();
  } catch (e) {
    return e;
  }
}

export async function cancelOrder(market: Market, orderId: string): Promise<boolean> {
  assert.ok(market);

  const client = createAuthenticatedClient();

  const cancelResult = await client.cancelOrder({
    symbol: market.id,
    orderId: parseInt(orderId, 10),
  });

  return cancelResult.orderId === parseInt(orderId, 10);
}

export async function queryOrder(
  market: Market,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(market);

  const client = createAuthenticatedClient();

  const orderResult = client.getOrder({
    symbol: market.id,
    orderId: parseInt(orderId, 10),
  });

  return orderResult;
}

export async function queryAllBalances(all = false): Promise<{ [key: string]: number } | Error> {
  const client = createAuthenticatedClient();

  const account = await client.accountInfo().catch((e: Error) => {
    return e;
  });
  if (account instanceof Error) return account;

  const result: { [key: string]: number } = {};

  account.balances.forEach((balance) => {
    result[balance.asset] = all
      ? parseFloat(balance.free) + parseFloat(balance.locked)
      : parseFloat(balance.free);
  });
  return result;
}

export async function getDepositAddresses(
  symbols: string[],
): Promise<{ [key: string]: { [key: string]: DepositAddress } }> {
  if (!symbols.includes('ETH')) symbols.push('ETH');
  if (!symbols.includes('TRX')) symbols.push('TRX');
  if (!symbols.includes('BNB')) symbols.push('BNB');

  const client = createAuthenticatedClient();
  const requests = symbols.map((symbol) => client.depositAddress({ asset: symbol }));
  const addresses = (await Promise.all(requests)).filter((x) => x.success);

  const ethAddress = addresses.filter((address) => address.asset === 'ETH')[0].address;
  assert.ok(ethAddress);
  const trxAddress = addresses.filter((address) => address.asset === 'TRX')[0].address;
  assert.ok(trxAddress);
  const bnbAddress = addresses.filter((address) => address.asset === 'BNB')[0].address;
  assert.ok(bnbAddress);

  // TODO: use sapi/v1/capital/deposit/address to get USDT-OMNI and USDT-TRC20

  const result: { [key: string]: { [key: string]: DepositAddress } } = {};
  addresses
    .filter((address) => symbols.includes(address.asset))
    .forEach((address) => {
      const symbol = address.asset;
      if (!(symbol in result)) result[symbol] = {};

      let platform = symbol;
      if (address.address === ethAddress && symbol !== 'ETH' && symbol !== 'ETC') {
        platform = 'ERC20';
        assert.equal(platform, detectPlatform(address.address, symbol));
      }
      if (address.address === trxAddress && symbol !== 'TRX') {
        platform = symbol === 'BTT' ? 'TRC10' : 'TRC20';
        assert.equal(platform, detectPlatform(address.address, symbol));
      }
      if (address.address === bnbAddress && symbol !== 'BNB') {
        platform = 'BEP2';
        assert.equal(platform, detectPlatform(address.address, symbol));
      }
      if (symbol === 'WTC') platform = 'WTC';
      if (symbol === 'CTXC') platform = 'CTXC';

      const depositAddress: DepositAddress = {
        symbol,
        platform,
        address: address.address,
      };
      if (address.addressTag) depositAddress.memo = address.addressTag;

      result[symbol][platform] = depositAddress;
    });

  return result;
}

export async function getWithdrawalFees(): Promise<{
  [key: string]: { [key: string]: WithdrawalFee };
}> {
  const result: { [key: string]: { [key: string]: WithdrawalFee } } = {};

  const client = createAuthenticatedClient();
  const assetDetail = await client.assetDetail();
  if (!assetDetail.success) return result;

  // console.info(JSON.stringify(assetDetail.assetDetail, undefined, 2));

  const depositAddresses = await getDepositAddresses(Object.keys(assetDetail.assetDetail));
  const tokenPlatformMap = calcTokenPlatform(depositAddresses);
  Object.keys(assetDetail.assetDetail).forEach((symbol) => {
    const detail = assetDetail.assetDetail[symbol];
    if (detail === undefined) return;

    let platform: string = tokenPlatformMap[symbol] || symbol;
    if (symbol === 'WTC') platform = 'WTC';

    if (!(symbol in result)) result[symbol] = {};

    result[symbol][platform] = {
      symbol,
      platform,
      fee: detail.withdrawFee,
      min: detail.minWithdrawAmount,
    };
  });

  return result;
}

export async function fetchCurrencies(): Promise<{ [key: string]: Currency }> {
  const result: { [key: string]: Currency } = {};

  const client = createAuthenticatedClient();
  const assetDetail = await client.assetDetail();
  if (!assetDetail.success) return result;

  // console.info(JSON.stringify(assetDetail.assetDetail, undefined, 2));

  Object.keys(assetDetail.assetDetail).forEach((symbol) => {
    const detail = assetDetail.assetDetail[symbol];

    result[symbol] = {
      symbol,
      active: detail.depositStatus && detail.withdrawStatus,
      depositEnabled: detail.depositStatus,
      withdrawalEnabled: detail.withdrawStatus,
    };
  });

  return result;
}

export async function withdraw(
  symbol: string,
  address: string,
  amount: number,
  platform: string,
  memo?: string,
): Promise<string | Error> {
  const client = createAuthenticatedClient();

  const params: any = {
    asset: symbol,
    address,
    amount,
  };
  if (memo) {
    params.addressTag = memo;
  }
  if (symbol !== platform) {
    const platformNetworkMap: { [key: string]: string } = {
      ERC20: 'ETH',
      OMNI: 'BTC',
      TRC10: 'TRX',
      TRC20: 'TRX',
    };
    const network = platformNetworkMap[platform];
    if (network === undefined)
      return new Error(`Binance ${symbol} ${platform} can NOT find network`);
    params.network = network;
  }
  const data = (await client.withdraw(params)) as { success: boolean; id: string };
  if (data.success) {
    return data.id;
  }
  return new Error(JSON.stringify(data));
}
