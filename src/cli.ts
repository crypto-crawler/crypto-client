#!/usr/bin/env node
/* eslint-disable no-console */
import yargs from 'yargs';
import { USER_CONFIG } from './config';
import { cancelOrder, createOrder, init, placeOrder, queryBalance, queryOrder } from './index';

const { argv } = yargs.options({
  eosAccount: {
    type: 'string',
  },
  eosPrivateKey: {
    type: 'string',
  },
  BINANCE_API_KEY: {
    type: 'string',
  },
  BINANCE_API_SECRET: {
    type: 'string',
  },
  BITFINEX_API_KEY: {
    type: 'string',
  },
  BITFINEX_API_SECRET: {
    type: 'string',
  },
  BITSTAMP_API_KEY: {
    type: 'string',
  },
  BITSTAMP_API_SECRET: {
    type: 'string',
  },
  BITSTAMP_USER_ID: {
    type: 'number',
  },
  CB_ACCESS_KEY: {
    type: 'string',
  },
  CB_ACCESS_SECRET: {
    type: 'string',
  },
  CB_ACCESS_PASSPHRASE: {
    type: 'string',
  },
  DFUSE_API_KEY: {
    type: 'string',
  },
  HUOBI_ACCESS_KEY: {
    type: 'string',
  },
  HUOBI_SECRET_KEY: {
    type: 'string',
  },
  HUOBI_ACCOUNT_ID: {
    type: 'number',
  },
  KRAKEN_API_KEY: {
    type: 'string',
  },
  KRAKEN_PRIVATE_KEY: {
    type: 'string',
  },
  MXCAccessKey: {
    type: 'string',
  },
  MXCSecretKey: {
    type: 'string',
  },
  OKEX_SPOT_API_KEY: {
    type: 'string',
  },
  OKEX_SPOT_API_SECRET: {
    type: 'string',
  },
  OKEX_SPOT_API_PASSPHRASE: {
    type: 'string',
  },
  OKEX_SPOT_FUND_PASSWORD: {
    type: 'string',
  },
  WHALEEX_API_KEY: {
    type: 'string',
  },
});

export async function testBinance(): Promise<void> {
  console.info(await queryBalance('Binance', 'EOS'));

  const orderId = await placeOrder(
    { exchange: 'Binance', pair: 'EOS_USDT', type: 'Spot' },
    10.9,
    1.1,
    true,
  );
  console.info(orderId);

  console.info(await queryOrder({ exchange: 'Binance', pair: 'EOS_USDT', type: 'Spot' }, orderId));

  console.info(await cancelOrder({ exchange: 'Binance', pair: 'EOS_USDT', type: 'Spot' }, orderId));

  console.info(await queryOrder({ exchange: 'Binance', pair: 'EOS_USDT', type: 'Spot' }, orderId));
}

export async function testBitfinex(): Promise<void> {
  console.info(await queryBalance('Bitfinex', 'ETH'));

  const orderId = await placeOrder(
    { exchange: 'Bitfinex', pair: 'ETH_USD', type: 'Spot' },
    241.11111,
    0.04,
    true,
    '123456',
  );
  console.info(orderId);

  console.info(await queryOrder({ exchange: 'Bitfinex', pair: 'ETH_USD', type: 'Spot' }, orderId));

  console.info(await cancelOrder({ exchange: 'Bitfinex', pair: 'ETH_USD', type: 'Spot' }, orderId));

  console.info(await queryOrder({ exchange: 'Bitfinex', pair: 'ETH_USD', type: 'Spot' }, orderId));
}

export async function testBitstamp(): Promise<void> {
  console.info(await queryBalance('Bitstamp', 'ETH'));

  const orderId = await placeOrder(
    { exchange: 'Bitstamp', pair: 'ETH_USD', type: 'Spot' },
    400.9,
    0.1,
    true,
  );
  console.info(orderId);

  console.info(await queryOrder({ exchange: 'Bitstamp', pair: 'ETH_USD', type: 'Spot' }, orderId));

  console.info(await cancelOrder({ exchange: 'Bitstamp', pair: 'ETH_USD', type: 'Spot' }, orderId));

  console.info(await queryOrder({ exchange: 'Bitstamp', pair: 'ETH_USD', type: 'Spot' }, orderId));
}

export async function testCoinbase(): Promise<void> {
  console.info(await queryBalance('CoinbasePro', 'BCH'));

  const orderId = await placeOrder(
    { exchange: 'CoinbasePro', pair: 'BCH_USD', type: 'Spot' },
    3999.48,
    0.1,
    true,
  );
  console.info(orderId);

  console.info(
    await queryOrder({ exchange: 'CoinbasePro', pair: 'BCH_USD', type: 'Spot' }, orderId),
  );

  console.info(
    await cancelOrder({ exchange: 'CoinbasePro', pair: 'BCH_USD', type: 'Spot' }, orderId),
  );

  console.info(
    await queryOrder({ exchange: 'CoinbasePro', pair: 'BCH_USD', type: 'Spot' }, orderId),
  );
}

export async function testHuobi(): Promise<void> {
  console.info(await queryBalance('Huobi', 'EOS'));

  const orderId = await placeOrder(
    { exchange: 'Huobi', pair: 'EOS_USDT', type: 'Spot' },
    10.9,
    0.1,
    true,
  );
  console.info(orderId);

  console.info(await queryOrder({ exchange: 'Huobi', pair: 'EOS_USDT', type: 'Spot' }, orderId));

  console.info(await cancelOrder({ exchange: 'Huobi', pair: 'EOS_USDT', type: 'Spot' }, orderId));

  console.info(await queryOrder({ exchange: 'Huobi', pair: 'EOS_USDT', type: 'Spot' }, orderId));
}

export async function testNewdex(): Promise<void> {
  const placeOrderId = await placeOrder(
    { exchange: 'Newdex', pair: 'EIDOS_EOS', type: 'Spot' },
    0.00121,
    9.2644,
    false,
  );
  console.info(placeOrderId);

  const orderInfo = await queryOrder(
    { exchange: 'Newdex', pair: 'EIDOS_EOS', type: 'Spot' },
    placeOrderId,
  );
  console.info(orderInfo);

  const cancelOrderId = await cancelOrder(
    { exchange: 'Newdex', pair: 'EIDOS_EOS', type: 'Spot' },
    placeOrderId,
  );
  console.info(cancelOrderId);
}

export async function testNewdexMYKEY(): Promise<void> {
  const placeOrderId = await placeOrder(
    { exchange: 'Newdex', pair: 'MYKEY_EOS', type: 'Spot' },
    0.34567,
    0.5,
    true,
  );
  console.info(placeOrderId);

  const orderInfo = await queryOrder(
    { exchange: 'Newdex', pair: 'MYKEY_EOS', type: 'Spot' },
    placeOrderId,
  );
  console.info(orderInfo);

  const cancelOrderId = await cancelOrder(
    { exchange: 'Newdex', pair: 'MYKEY_EOS', type: 'Spot' },
    placeOrderId,
  );
  console.info(cancelOrderId);
}

export async function testOKEx_Spot(): Promise<void> {
  console.info(await queryBalance('OKEx', 'ETH'));

  const orderId = await placeOrder(
    { exchange: 'OKEx', pair: 'ETH_USDT', type: 'Spot' },
    299.99,
    0.001001,
    true,
  );
  console.info(orderId);

  console.info(await queryOrder({ exchange: 'OKEx', pair: 'ETH_USDT', type: 'Spot' }, orderId));

  console.info(await cancelOrder({ exchange: 'OKEx', pair: 'ETH_USDT', type: 'Spot' }, orderId));

  console.info(await queryOrder({ exchange: 'OKEx', pair: 'ETH_USDT', type: 'Spot' }, orderId));
}

export async function testWhaleEx(): Promise<void> {
  const orderId = await placeOrder(
    { exchange: 'WhaleEx', pair: 'EIDOS_EOS', type: 'Spot' },
    0.00121,
    9.2644,
    false,
  );
  console.info(orderId);

  console.info(await queryOrder({ exchange: 'WhaleEx', pair: 'EIDOS_EOS', type: 'Spot' }, orderId));

  console.info(
    await cancelOrder({ exchange: 'WhaleEx', pair: 'EIDOS_EOS', type: 'Spot' }, orderId),
  );

  console.info(await queryOrder({ exchange: 'WhaleEx', pair: 'EIDOS_EOS', type: 'Spot' }, orderId));
}

export async function testWhaleExMYKEY(): Promise<void> {
  const orderId = await placeOrder(
    { exchange: 'WhaleEx', pair: 'MYKEY_EOS', type: 'Spot' },
    0.345678,
    0.5,
    true,
  );
  console.info(orderId);

  console.info(await queryOrder({ exchange: 'WhaleEx', pair: 'MYKEY_EOS', type: 'Spot' }, orderId));

  console.info(
    await cancelOrder({ exchange: 'WhaleEx', pair: 'MYKEY_EOS', type: 'Spot' }, orderId),
  );

  console.info(await queryOrder({ exchange: 'WhaleEx', pair: 'MYKEY_EOS', type: 'Spot' }, orderId));
}

export async function testWhaleExEos(): Promise<void> {
  const action = createOrder(
    { exchange: 'WhaleEx', pair: 'EIDOS_EOS', type: 'Spot' },
    0.00121,
    9.2644,
    false,
  );
  console.info(action);
  // const txid = await sendTransaction([action], getRandomApi(USER_CONFIG.eosPrivateKey!));
  // console.info(txid);
}

export async function testKraken1(): Promise<void> {
  console.info(await queryBalance('Kraken', 'USD'));

  const orderId = await placeOrder(
    { exchange: 'Kraken', pair: 'EOS_USD', type: 'Spot' },
    1.6666,
    3.11111111,
    false,
  );
  console.info(orderId);

  console.info(await queryOrder({ exchange: 'Kraken', pair: 'EOS_USD', type: 'Spot' }, orderId));

  console.info(await cancelOrder({ exchange: 'Kraken', pair: 'EOS_USD', type: 'Spot' }, orderId));

  console.info(await queryOrder({ exchange: 'Kraken', pair: 'EOS_USD', type: 'Spot' }, orderId));
}

export async function testKraken(): Promise<void> {
  console.info(await queryBalance('Kraken', 'USD'));

  const orderId = await placeOrder(
    { exchange: 'Kraken', pair: 'BTC_USD', type: 'Spot' },
    1.6,
    3.11111111,
    false,
  );
  console.info(orderId);

  console.info(await queryOrder({ exchange: 'Kraken', pair: 'BTC_USD', type: 'Spot' }, orderId));

  console.info(await cancelOrder({ exchange: 'Kraken', pair: 'BTC_USD', type: 'Spot' }, orderId));

  console.info(await queryOrder({ exchange: 'Kraken', pair: 'BTC_USD', type: 'Spot' }, orderId));
}

export async function testMXC(): Promise<void> {
  console.info(await queryBalance('MXC', 'EOS'));

  const orderId = await placeOrder(
    { exchange: 'MXC', pair: 'EOS_USDT', type: 'Spot' },
    9.4873,
    1.111,
    true,
  );
  console.info(orderId);

  console.info(await queryOrder({ exchange: 'MXC', pair: 'EOS_USDT', type: 'Spot' }, orderId));

  console.info(await cancelOrder({ exchange: 'MXC', pair: 'EOS_USDT', type: 'Spot' }, orderId));

  console.info(await queryOrder({ exchange: 'MXC', pair: 'EOS_USDT', type: 'Spot' }, orderId));
}

(async (): Promise<void> => {
  await init(argv);

  console.info(USER_CONFIG);

  await testKraken();
})();
