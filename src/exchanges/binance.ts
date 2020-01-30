import { strict as assert } from 'assert';
import createClient, { Binance } from 'binance-api-node';
import { PairInfo } from 'exchange-info';
import { USER_CONFIG } from '../config';
import { DepositAddress, SubType } from '../pojo/deposit_address';
import { WithdrawalFee } from '../pojo/withdrawal_fee';
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

export async function queryAllBalances(): Promise<{ [key: string]: number }> {
  const client = createAuthenticatedClient();

  const account = await client.accountInfo();

  const result: { [key: string]: number } = {};

  account.balances.forEach(balance => {
    result[balance.asset] = parseFloat(balance.free);
  });
  return result;
}

export async function getWithdrawalFees(
  symbols: string[],
): Promise<{ [key: string]: WithdrawalFee }> {
  const result: { [key: string]: WithdrawalFee } = {};

  const client = createAuthenticatedClient();
  const assetDetail = await client.assetDetail();
  if (!assetDetail.success) return result;

  // console.info(assetDetail.assetDetail);

  symbols.forEach(symbol => {
    const detail = assetDetail.assetDetail[symbol];
    if (detail === undefined) return;

    const fee: WithdrawalFee = {
      symbol,
      deposit_enabled: detail.depositStatus,
      withdraw_enabled: detail.withdrawStatus,
      withdrawal_fee: detail.withdrawFee,
      min_withdraw_amount: detail.minWithdrawAmount,
    };
    if (symbol === 'USDT') fee.subtype = 'ERC20';

    result[symbol] = fee;
  });
  return result;
}

export async function getDepositAddresses(
  symbols: string[],
): Promise<{ [key: string]: DepositAddress[] }> {
  const result: { [key: string]: DepositAddress[] } = {};

  const client = createAuthenticatedClient();
  const requests = symbols.map(symbol => client.depositAddress({ asset: symbol }));
  const addresses = (await Promise.all(requests)).filter(x => x.success);

  // TODO: use sapi/v1/capital/deposit/address to get USDT-OMNI and USDT-TRC20

  addresses
    .filter(address => symbols.includes(address.asset))
    .forEach(address => {
      let symbol: string;
      let subtype: string | undefined;

      if (address.asset.includes('-')) {
        const [symbol_, subtype_] = address.asset.split('-');
        symbol = symbol_;
        subtype = subtype_;
      } else {
        symbol = address.asset;
      }

      const depositAddress: DepositAddress = {
        symbol,
        address: address.address,
      };
      if (address.addressTag) depositAddress.memo = address.addressTag;
      if (symbol === 'USDT' || symbol === 'WTC') depositAddress.subtype = 'ERC20';
      if (subtype) depositAddress.subtype = subtype as SubType;

      if (!(symbol in result)) {
        result[symbol] = [];
      }
      result[symbol].push(depositAddress);
    });

  return result;
}
