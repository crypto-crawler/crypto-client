# crypto-order

A library to place and cancel orders at crypto exchanges.

## How to use

```javascript
/* eslint-disable no-console */
const CryptoOrder = require('crypto-order'); // eslint-disable-line import/no-unresolved

(async () => {
  await CryptoOrder.init({
    eosAccount: 'your-eos-account',
    eosPrivateKey: 'your-eos-private-key',
  });

  // buy
  const transactionId = await CryptoOrder.placeOrder('Newdex', 'EIDOS_EOS', 0.00121, 9.2644, false);
  console.info(transactionId);

  const orderInfo = await CryptoOrder.queryOrder('Newdex', 'EIDOS_EOS', transactionId);
  console.info(orderInfo);

  const cancelTransactionId = await CryptoOrder.cancelOrder('Newdex', 'EIDOS_EOS', transactionId);
  console.info(cancelTransactionId);
})();
```

## Supported Exchanges

- Binance
- Bitfinex
- Bitstamp
- Coinbase
- Huobi
- Kraken
- MXC
- Newdex
- OKEx_Spot
- WhaleEx

## Related Projects

- [crypto-crawler](https://www.npmjs.com/package/crypto-crawler), crawl orderbook and trade messages from crypto exchanges.
