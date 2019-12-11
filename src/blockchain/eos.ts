import { strict as assert } from 'assert';
import { Api, JsonRpc, Serialize } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig'; // development only
import { EOS_API_ENDPOINTS } from '../config';

const fetch = require('node-fetch'); // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');

export const EOS_QUANTITY_PRECISION = 4;

export function getRandomRpc() {
  assert.ok(EOS_API_ENDPOINTS.length, 'need to call init() first');
  const url = EOS_API_ENDPOINTS[Math.floor(Math.random() * EOS_API_ENDPOINTS.length)];
  return new JsonRpc(url, { fetch });
}

export function getRandomApi(privateKey: string) {
  const rpc = getRandomRpc();
  const api = new Api({
    rpc,
    signatureProvider: new JsSignatureProvider([privateKey]),
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder(),
  });
  return api;
}

export async function queryTransaction(id: string, blockNum?: number): Promise<any> {
  const rpc = getRandomRpc();
  const response = await rpc.history_get_transaction(id, blockNum); // eslint-disable-line no-await-in-loop
  if (response.transaction_id || response.id) {
    return response;
  }
  throw Error('Unknown response format');
}

export async function queryEOSBalance(account: string, rpc: JsonRpc): Promise<number> {
  const balanceInfo = await rpc.get_currency_balance('eosio.token', account, 'EOS');
  const balance = parseFloat(balanceInfo[0].split(' ')[0]);
  return balance;
}

export async function queryEOSTokenBalance(
  account: string,
  symbol: string,
  contract: string,
  rpc: JsonRpc,
): Promise<number> {
  const balanceInfo = await rpc.get_currency_balance(contract, account, symbol);
  const balance = parseFloat(balanceInfo[0].split(' ')[0]);
  return balance;
}

export async function queryEIDOSBalance(account: string, rpc: JsonRpc): Promise<number> {
  return queryEOSTokenBalance(account, 'EIDOS', 'eidosonecoin', rpc);
}

export async function sendTransaction(actions: Serialize.Action[], api: Api): Promise<any> {
  return api.transact(
    {
      actions,
    },
    {
      blocksBehind: 3,
      expireSeconds: 300,
    },
  );
}

export async function sendEOS(
  from: string,
  privateKey: string,
  to: string,
  quantity: string,
  memo = '',
): Promise<any> {
  const action: Serialize.Action = {
    account: 'eosio.token',
    name: 'transfer',
    authorization: [
      {
        actor: from,
        permission: 'active',
      },
    ],
    data: {
      from,
      to,
      quantity: `${quantity} EOS`,
      memo,
    },
  };

  return sendTransaction([action], getRandomApi(privateKey));
}

// EOS token is similar to ETH ERC20 token.
/**
 * Send EOS token to another account.
 *
 * @param from  The sender's EOS account
 * @param privateKey The sender's EOS private key
 * @param to The receiver's EOS account
 * @param symbol Token name, capitalized alpha characters only
 * @param contract The contract name of the token
 * @param quantity how many to send
 * @param memo memo
 */
export async function sendEOSToken(
  from: string,
  privateKey: string,
  to: string,
  symbol: string,
  contract: string,
  quantity: string,
  memo = '',
): Promise<any> {
  const action: Serialize.Action = {
    account: contract,
    name: 'transfer',
    authorization: [
      {
        actor: from,
        permission: 'active',
      },
    ],
    data: {
      from,
      to,
      quantity: `${quantity} ${symbol}`,
      memo,
    },
  };

  return sendTransaction([action], getRandomApi(privateKey));
}
