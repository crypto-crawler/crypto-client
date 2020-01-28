#!/usr/bin/env node
/* eslint-disable no-console */
import yargs from 'yargs';
import { USER_CONFIG } from './config';
import {
  cancelOrder,
  createOrder,
  getDepositAddresses,
  getWithdrawalFees,
  init,
  placeOrder,
  queryAllBalances,
  queryBalance,
  queryOrder,
} from './index';

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
  WHALEEX_API_KEY: {
    type: 'string',
  },
});

export async function testBinance(): Promise<void> {
  console.info(await queryBalance('Binance', 'EOS'));

  const orderId = await placeOrder('Binance', 'EOS_USDT', 10.9, 1.1, true);
  console.info(orderId);

  console.info(await queryOrder('Binance', 'EOS_USDT', orderId));

  console.info(await cancelOrder('Binance', 'EOS_USDT', orderId));

  console.info(await queryOrder('Binance', 'EOS_USDT', orderId));
}

export async function testBitfinex(): Promise<void> {
  console.info(await queryBalance('Bitfinex', 'ETH'));

  const orderId = await placeOrder('Bitfinex', 'ETH_USD', 241.11111, 0.04, true, '123456');
  console.info(orderId);

  console.info(await queryOrder('Bitfinex', 'ETH_USD', orderId));

  console.info(await cancelOrder('Bitfinex', 'ETH_USD', orderId));

  console.info(await queryOrder('Bitfinex', 'ETH_USD', orderId));
}

export async function testBitstamp(): Promise<void> {
  console.info(await queryBalance('Bitstamp', 'ETH'));

  const orderId = await placeOrder('Bitstamp', 'ETH_USD', 400.9, 0.1, true);
  console.info(orderId);

  console.info(await queryOrder('Bitstamp', 'ETH_USD', orderId));

  console.info(await cancelOrder('Bitstamp', 'ETH_USD', orderId));

  console.info(await queryOrder('Bitstamp', 'ETH_USD', orderId));
}

export async function testCoinbase(): Promise<void> {
  console.info(await queryBalance('Coinbase', 'BCH'));

  const orderId = await placeOrder('Coinbase', 'BCH_USD', 3999.48, 0.1, true);
  console.info(orderId);

  console.info(await queryOrder('Coinbase', 'BCH_USD', orderId));

  console.info(await cancelOrder('Coinbase', 'BCH_USD', orderId));

  console.info(await queryOrder('Coinbase', 'BCH_USD', orderId));
}

export async function testHuobi(): Promise<void> {
  console.info(await queryBalance('Huobi', 'EOS'));

  const orderId = await placeOrder('Huobi', 'EOS_USDT', 10.9, 0.1, true);
  console.info(orderId);

  console.info(await queryOrder('Huobi', 'EOS_USDT', orderId));

  console.info(await cancelOrder('Huobi', 'EOS_USDT', orderId));

  console.info(await queryOrder('Huobi', 'EOS_USDT', orderId));
}

export async function testNewdex(): Promise<void> {
  const placeOrderId = await placeOrder('Newdex', 'EIDOS_EOS', 0.00121, 9.2644, false);
  console.info(placeOrderId);

  const orderInfo = await queryOrder('Newdex', 'EIDOS_EOS', placeOrderId);
  console.info(orderInfo);

  const cancelOrderId = await cancelOrder('Newdex', 'EIDOS_EOS', placeOrderId);
  console.info(cancelOrderId);
}

export async function testNewdexMYKEY(): Promise<void> {
  const placeOrderId = await placeOrder('Newdex', 'MYKEY_EOS', 0.34567, 0.5, true);
  console.info(placeOrderId);

  const orderInfo = await queryOrder('Newdex', 'MYKEY_EOS', placeOrderId);
  console.info(orderInfo);

  const cancelOrderId = await cancelOrder('Newdex', 'MYKEY_EOS', placeOrderId);
  console.info(cancelOrderId);
}

export async function testOKEx_Spot(): Promise<void> {
  console.info(await queryBalance('OKEx_Spot', 'ETH'));

  const orderId = await placeOrder('OKEx_Spot', 'ETH_USDT', 299.99, 0.001001, true);
  console.info(orderId);

  console.info(await queryOrder('OKEx_Spot', 'ETH_USDT', orderId));

  console.info(await cancelOrder('OKEx_Spot', 'ETH_USDT', orderId));

  console.info(await queryOrder('OKEx_Spot', 'ETH_USDT', orderId));
}

export async function testWhaleEx(): Promise<void> {
  const orderId = await placeOrder('WhaleEx', 'EIDOS_EOS', 0.00121, 9.2644, false);
  console.info(orderId);

  console.info(await queryOrder('WhaleEx', 'EIDOS_EOS', orderId));

  console.info(await cancelOrder('WhaleEx', 'EIDOS_EOS', orderId));

  console.info(await queryOrder('WhaleEx', 'EIDOS_EOS', orderId));
}

export async function testWhaleExMYKEY(): Promise<void> {
  const orderId = await placeOrder('WhaleEx', 'MYKEY_EOS', 0.345678, 0.5, true);
  console.info(orderId);

  console.info(await queryOrder('WhaleEx', 'MYKEY_EOS', orderId));

  console.info(await cancelOrder('WhaleEx', 'MYKEY_EOS', orderId));

  console.info(await queryOrder('WhaleEx', 'MYKEY_EOS', orderId));
}

export async function testWhaleExEos(): Promise<void> {
  const action = createOrder('WhaleEx', 'EIDOS_EOS', 0.00121, 9.2644, false);
  console.info(action);
  // const txid = await sendTransaction([action], getRandomApi(USER_CONFIG.eosPrivateKey!));
  // console.info(txid);
}

export async function testKraken1(): Promise<void> {
  console.info(await queryBalance('Kraken', 'USD'));

  const orderId = await placeOrder('Kraken', 'EOS_USD', 1.6666, 3.11111111, false);
  console.info(orderId);

  console.info(await queryOrder('Kraken', 'EOS_USD', orderId));

  console.info(await cancelOrder('Kraken', 'EOS_USD', orderId));

  console.info(await queryOrder('Kraken', 'EOS_USD', orderId));
}

export async function testKraken(): Promise<void> {
  console.info(await queryBalance('Kraken', 'USD'));

  const orderId = await placeOrder('Kraken', 'BTC_USD', 1.6, 3.11111111, false);
  console.info(orderId);

  console.info(await queryOrder('Kraken', 'BTC_USD', orderId));

  console.info(await cancelOrder('Kraken', 'BTC_USD', orderId));

  console.info(await queryOrder('Kraken', 'BTC_USD', orderId));
}

export async function testMXC(): Promise<void> {
  console.info(await queryBalance('MXC', 'EOS'));

  const orderId = await placeOrder('MXC', 'EOS_USDT', 9.4873, 1.111, true);
  console.info(orderId);

  console.info(await queryOrder('MXC', 'EOS_USDT', orderId));

  console.info(await cancelOrder('MXC', 'EOS_USDT', orderId));

  console.info(await queryOrder('MXC', 'EOS_USDT', orderId));
}

export async function testAllBalances(): Promise<void> {
  // console.info(await queryAllBalances('Binance'));
  // console.info(await queryAllBalances('Bitfinex'));
  // console.info(await queryAllBalances('Bitstamp'));
  // console.info(await queryAllBalances('Coinbase'));
  // console.info(await queryAllBalances('Huobi'));
  // console.info(await queryAllBalances('Kraken'));
  // console.info(await queryAllBalances('MXC'));
  // console.info(await queryAllBalances('Newdex'));
  // console.info(await queryAllBalances('OKEx_Spot'));
  console.info(await queryAllBalances('WhaleEx'));
}

export async function testGetDepositAddresses(): Promise<void> {
  const symbols = ['BTC', 'EOS', 'ETH', 'MYKEY', 'USDT', 'XXX', 'YAS'];

  console.info(await getDepositAddresses('Binance', symbols));

  // const symbols = Array.from(
  //   new Set(
  //     Object.keys((await getExchangeInfo('OKEx_Spot', 'Spot')).pairs).flatMap(p => p.split('_')),
  //   ),
  // );

  const okex = await getDepositAddresses('OKEx_Spot', symbols);
  console.info(okex);

  symbols.forEach(symbol => {
    if (!(symbol in okex)) {
      console.error(symbol);
    }
  });

  console.info(await getDepositAddresses('Newdex', symbols));

  console.info(await getDepositAddresses('WhaleEx', symbols));
}

export async function testGetWithdrawlFees(): Promise<void> {
  const symbols = ['BTC', 'EOS', 'ETH', 'MYKEY', 'USDT', 'XXX', 'YAS'];

  console.info(await getWithdrawalFees('Binance', symbols));
  console.info(await getWithdrawalFees('OKEx_Spot', symbols));
  console.info(await getWithdrawalFees('Newdex', symbols));
  console.info(await getWithdrawalFees('WhaleEx', symbols));

  console.info(symbols); // make sure symbols not changed
}

(async () => {
  await init(argv);

  console.info(USER_CONFIG);

  await testKraken();
})();
