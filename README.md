# crypto-client

An unified client for all cryptocurrency exchanges.

## How to use

```javascript
/* eslint-disable */
const CryptoClient = require('crypto-client');

(async () => {
  await CryptoClient.init({
    eosAccount: 'your-eos-account',
    eosPrivateKey: 'your-eos-private-key',
  });

  // buy
  const transactionId = await placeOrder(
    { exchange: 'Newdex', pair: 'EIDOS_EOS', type: 'Spot' },
    0.00121,
    9.2644,
    false,
  );
  console.info(transactionId);

  const orderInfo = await CryptoClient.queryOrder(
    { exchange: 'Newdex', pair: 'EIDOS_EOS', type: 'Spot' },
    transactionId,
  );
  console.info(orderInfo);

  const cancelTransactionId = await CryptoClient.cancelOrder(
    { exchange: 'Newdex', pair: 'EIDOS_EOS', type: 'Spot' },
    transactionId,
  );
  console.info(cancelTransactionId);
})();
```

## Supported Exchanges

- Binance
- Bitfinex
- Bitstamp
- CoinbasePro
- Huobi
- Kraken
- MXC
- Newdex
- OKEx
- WhaleEx

## Related Projects

- [crypto-bbo](https://www.npmjs.com/package/crypto-bbo), crawl BBO messages from cryptocurrency exchanges.
- [crypto-crawler](https://www.npmjs.com/package/crypto-crawler), crawl orderbook and trade messages from cryptocurrency exchanges.
