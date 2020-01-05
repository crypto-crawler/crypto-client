#!/usr/bin/env node
/* eslint-disable no-console */
import yargs from 'yargs';
import { USER_CONFIG } from './config';
import {
  cancelOrder,
  createOrder,
  init,
  placeOrder,
  queryBalance,
  queryOrder,
  SUPPORTED_EXCHANGES,
} from './index';

const { argv } = yargs.options({
  exchange: {
    choices: SUPPORTED_EXCHANGES,
    type: 'string',
    demandOption: true,
  },
  eosAccount: {
    type: 'string',
  },
  eosPrivateKey: {
    type: 'string',
  },
  whaleExApiKey: {
    type: 'string',
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
  BINANCE_API_KEY: {
    type: 'string',
  },
  BINANCE_API_SECRET: {
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
});

export async function testBinance(): Promise<void> {
  console.info(await queryBalance('Binance', 'EOS'));

  const orderId = await placeOrder('Binance', 'EOS_USDT', 10.9, 1.1, true);
  console.info(orderId);

  console.info(await queryOrder('Binance', 'EOS_USDT', orderId));

  console.info(await cancelOrder('Binance', 'EOS_USDT', orderId));

  console.info(await queryOrder('Binance', 'EOS_USDT', orderId));
}

export async function testBitstamp(): Promise<void> {
  console.info(await queryBalance('Bitstamp', 'ETH'));

  const orderId = await placeOrder('Bitstamp', 'ETH_USD', 200.9, 0.5, true);
  console.info(orderId);

  console.info(await queryOrder('Bitstamp', 'ETH_USD', orderId));

  console.info(await cancelOrder('Bitstamp', 'ETH_USD', orderId));

  console.info(await queryOrder('Bitstamp', 'ETH_USD', orderId));
}

export async function testCoinbase(): Promise<void> {
  console.info(await queryBalance('Coinbase', 'BCH'));

  const orderId = await placeOrder('Coinbase', 'BCH_USD', 607.48, 0.6731677072288, true);
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

export async function testWhaleEx(): Promise<void> {
  const orderId = await placeOrder('WhaleEx', 'EIDOS_EOS', 0.00121, 9.2644, false);
  console.info(orderId);

  console.info(await queryOrder('WhaleEx', 'EIDOS_EOS', orderId));

  console.info(await cancelOrder('WhaleEx', 'EIDOS_EOS', orderId));

  console.info(await queryOrder('WhaleEx', 'EIDOS_EOS', orderId));
}

export async function testWhaleExEos(): Promise<void> {
  const action = createOrder('WhaleEx', 'EIDOS_EOS', 0.00121, 9.2644, false);
  console.info(action);
  // const txid = await sendTransaction([action], getRandomApi(USER_CONFIG.eosPrivateKey!));
  // console.info(txid);
}

export async function testKraken(): Promise<void> {
  console.info(await queryBalance('Kraken', 'USD'));

  const orderId = await placeOrder('Kraken', 'EOS_USD', 1.6666, 3.11111111, false);
  console.info(orderId);

  console.info(await queryOrder('Kraken', 'EOS_USD', orderId));

  console.info(await cancelOrder('Kraken', 'EOS_USD', orderId));

  console.info(await queryOrder('Kraken', 'EOS_USD', orderId));
}

export async function testMXC(): Promise<void> {
  console.info(await queryBalance('MXC', 'EOS'));

  const orderId = await placeOrder('MXC', 'EOS_USDT', 9.4873, 1.111, true);
  console.info(orderId);

  console.info(await queryOrder('MXC', 'EOS_USDT', orderId));

  console.info(await cancelOrder('MXC', 'EOS_USDT', orderId));

  console.info(await queryOrder('MXC', 'EOS_USDT', orderId));
}

(async () => {
  await init(argv);

  console.info(USER_CONFIG);

  await testKraken();
})();
