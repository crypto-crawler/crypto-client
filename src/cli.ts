#!/usr/bin/env node
/* eslint-disable no-console */
import yargs from 'yargs';
import {
  init,
  createOrder,
  placeOrder,
  queryOrder,
  cancelOrder,
  queryBalance,
  SUPPORTED_EXCHANGES,
} from './index';
import { USER_CONFIG } from './config';

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
  MXCAccessKey: {
    type: 'string',
  },
  MXCSecretKey: {
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
  HUOBI_ACCESS_KEY: {
    type: 'string',
  },
  HUOBI_SECRET_KEY: {
    type: 'string',
  },
  HUOBI_ACCOUNT_ID: {
    type: 'number',
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

export async function testCoinbase(): Promise<void> {
  console.info(await queryBalance('Coinbase', 'EOS'));

  const orderId = await placeOrder('Coinbase', 'EOS_USDT', 10.9, 1.1, true);
  console.info(orderId);

  console.info(await queryOrder('Coinbase', 'EOS_USDT', orderId));

  console.info(await cancelOrder('Coinbase', 'EOS_USDT', orderId));

  console.info(await queryOrder('Coinbase', 'EOS_USDT', orderId));
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

export async function testMXC(): Promise<void> {
  console.info(await queryBalance('MXC', 'EOS'));

  const orderId = await placeOrder('MXC', 'EOS_USDT', 9.4873, 1.111, true);
  console.info(orderId);

  console.info(await queryOrder('MXC', 'EOS_USDT', orderId));

  console.info(await cancelOrder('MXC', 'EOS_USDT', orderId));

  console.info(await queryOrder('MXC', 'EOS_USDT', orderId));
}

(async () => {
  await init({
    eosAccount: argv.eosAccount,
    eosPrivateKey: argv.eosPrivateKey,
    whaleExApiKey: argv.whaleExApiKey,
    MXCAccessKey: argv.MXCAccessKey,
    MXCSecretKey: argv.MXCSecretKey,
    CB_ACCESS_KEY: argv.CB_ACCESS_KEY,
    CB_ACCESS_SECRET: argv.CB_ACCESS_SECRET,
    CB_ACCESS_PASSPHRASE: argv.CB_ACCESS_PASSPHRASE,
    BINANCE_API_KEY: argv.BINANCE_API_KEY,
    BINANCE_API_SECRET: argv.BINANCE_API_SECRET,
    HUOBI_ACCESS_KEY: argv.HUOBI_ACCESS_KEY,
    HUOBI_SECRET_KEY: argv.HUOBI_SECRET_KEY,
    HUOBI_ACCOUNT_ID: argv.HUOBI_ACCOUNT_ID,
  });

  console.info(USER_CONFIG);

  await testMXC();

  // await testWhaleEx();
  // await testWhaleExEos();
  console.info(await queryOrder('WhaleEx', 'EIDOS_EOS', '103350367647369'));
})();
