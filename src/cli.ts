#!/usr/bin/env node
/* eslint-disable no-console */
import yargs from 'yargs';

import { init, placeOrder, queryOrder, cancelOrder, EXCHANGES } from './index';

const { argv } = yargs.options({
  exchange: {
    choices: EXCHANGES,
    type: 'string',
    demandOption: true,
  },
  eosAccount: {
    type: 'string',
    demandOption: true,
  },
  eosPrivateKey: {
    type: 'string',
    demandOption: true,
  },
});

async function testAll(): Promise<void> {
  const placeOrderId = await placeOrder('Newdex', 'EIDOS_EOS', '0.00121', '9.2644', false);
  console.info(placeOrderId);

  const orderInfo = await queryOrder('Newdex', 'EIDOS_EOS', placeOrderId);
  console.info(orderInfo);

  const cancelOrderId = await cancelOrder('Newdex', 'EIDOS_EOS', placeOrderId);
  console.info(cancelOrderId);
}

(async () => {
  await init({
    eosAccount: argv.eosAccount,
    eosPrivateKey: argv.eosPrivateKey,
  });

  await testAll();
})();
