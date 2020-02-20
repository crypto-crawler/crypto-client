import { strict as assert } from 'assert';
import createClient, { Binance } from 'binance-api-node';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { WithdrawalFee } from '../pojo';
import { Currency } from '../pojo/currency';
import { DepositAddress } from '../pojo/deposit_address';
import { convertPriceAndQuantityToStrings } from '../util';

function createAuthenticatedClient(): Binance {
  assert.ok(USER_CONFIG.BINANCE_API_KEY);
  assert.ok(USER_CONFIG.BINANCE_API_SECRET);

  return createClient({
    apiKey: USER_CONFIG.BINANCE_API_KEY!,
    apiSecret: USER_CONFIG.BINANCE_API_SECRET!,
  });
}

export async function placeOrder(
  pairInfo: PairInfo,
  price: number,
  quantity: number,
  sell: boolean,
): Promise<string> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  const [priceStr, quantityStr] = convertPriceAndQuantityToStrings(pairInfo, price, quantity, sell);

  const order = await client.order({
    symbol: pairInfo.raw_pair,
    type: 'LIMIT',
    side: sell ? 'SELL' : 'BUY',
    quantity: quantityStr,
    price: priceStr,
  });

  return order.orderId.toString();
}

export async function cancelOrder(pairInfo: PairInfo, orderId: string): Promise<boolean> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  const cancelResult = await client.cancelOrder({
    symbol: pairInfo.raw_pair,
    orderId: parseInt(orderId, 10),
  });

  return cancelResult.orderId === parseInt(orderId, 10);
}

export async function queryOrder(
  pairInfo: PairInfo,
  orderId: string,
): Promise<{ [key: string]: any } | undefined> {
  assert.ok(pairInfo);

  const client = createAuthenticatedClient();

  const orderResult = client.getOrder({
    symbol: pairInfo.raw_pair,
    orderId: parseInt(orderId, 10),
  });

  return orderResult;
}

export async function queryAllBalances(all: boolean = false): Promise<{ [key: string]: number }> {
  const client = createAuthenticatedClient();

  const account = await client.accountInfo();

  const result: { [key: string]: number } = {};

  account.balances.forEach(balance => {
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

  const client = createAuthenticatedClient();
  const requests = symbols.map(symbol => client.depositAddress({ asset: symbol }));
  const addresses = (await Promise.all(requests)).filter(x => x.success);

  const ethAddress = addresses.filter(address => address.asset === 'ETH')[0].address;
  assert.ok(ethAddress);

  // TODO: use sapi/v1/capital/deposit/address to get USDT-OMNI and USDT-TRC20

  const result: { [key: string]: { [key: string]: DepositAddress } } = {};
  addresses
    .filter(address => symbols.includes(address.asset))
    .forEach(address => {
      const symbol = address.asset;
      if (!(symbol in result)) result[symbol] = {};

      let platform = symbol;
      if (address.address === ethAddress) {
        platform = 'Ethereum';
      }
      if (symbol === 'WTC') platform = 'WTC';
      if (symbol === 'CTXC') platform = 'CTXC';
      if (['GTO', 'MITH', 'ONE'].includes(symbol)) platform = 'Binance Coin';

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

  Object.keys(assetDetail.assetDetail).forEach(symbol => {
    const detail = assetDetail.assetDetail[symbol];
    if (detail === undefined) return;

    let platform = symbol;
    if (symbol === 'WTC') platform = 'Ethereum';
    if (['GTO', 'MITH'].includes(symbol)) platform = 'Binance Coin';

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

  Object.keys(assetDetail.assetDetail).forEach(symbol => {
    const detail = assetDetail.assetDetail[symbol];
    if (detail === undefined) return;

    let platform = symbol;
    if (symbol === 'WTC') platform = 'Ethereum';
    if (['GTO', 'MITH'].includes(symbol)) platform = 'Binance Coin';

    result[symbol] = {
      symbol,
      trading: true,
      deposit: {},
      withdrawal: {},
    };
    result[symbol].deposit[platform] = {
      platform,
      enabled: detail.depositStatus,
    };

    result[symbol].withdrawal[platform] = {
      platform,
      enabled: detail.withdrawStatus,
      fee: detail.withdrawFee,
      min: detail.minWithdrawAmount,
    };
  });

  return result;
}
