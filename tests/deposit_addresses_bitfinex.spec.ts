import Axios from 'axios';
import { normalizeSymbol } from 'crypto-pair';
import { fetchDepositAddress } from '../src/exchanges/bitfinex';
import { getDepositAddresses, init } from '../src/index';
import readUserConfig from './user_config';

beforeAll(async () => {
  const userConfig = readUserConfig();
  await init(userConfig);
  jest.setTimeout(200 * 1000); // 200 seconds
});

test("getDepositAddresses('Bitfinex')", async () => {
  const symbols = ['BTC', 'EOS', 'ETH', 'XXX'];

  const addresses = await getDepositAddresses('Bitfinex', symbols);

  expect(addresses).toHaveProperty('BTC');
  expect(addresses).toHaveProperty('EOS');
  expect(addresses).toHaveProperty('ETH');
  // expect(addresses).toHaveProperty('USDT'); // TODO: add USDT for Bitfinex
  expect(addresses).not.toHaveProperty('XXX');
});

test('fetchDepositAddress()', async () => {
  const response = await Axios.get('https://api.bitfinex.com/v2/conf/pub:map:currency:label');
  expect(response.status).toEqual(200);

  const symbolLabelArr = response.data[0] as string[][];

  const symbols: string[][] = [];
  const labels: string[][] = [];
  const errors: string[][] = [];

  for (let i = 0; i < symbolLabelArr.length; i += 1) {
    const [symbol, label] = symbolLabelArr[i];
    let address = await fetchDepositAddress(label); // eslint-disable-line no-await-in-loop
    if (!(address instanceof Error)) {
      labels.push([symbol, label]);
    }

    address = await fetchDepositAddress(symbol); // eslint-disable-line no-await-in-loop
    if (!(address instanceof Error)) {
      symbols.push([symbol, label]);
    } else {
      errors.push([symbol, label, address.message]);
    }
  }
  console.info(symbols);
  console.info(labels);
  console.info(errors);

  const symbolLabelMap: { [key: string]: string } = {};
  labels.forEach(x => {
    const [symbol, label] = x;
    const normalizedSymbol = normalizeSymbol(symbol, 'Bitfinex');
    if (normalizedSymbol !== label) {
      symbolLabelMap[normalizedSymbol] = label;
    }
  });
  console.info(symbolLabelMap);
});
