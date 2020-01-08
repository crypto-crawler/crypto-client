// forked from https://github.com/WhaleEx/API/blob/master/sample/nodejs/whaleex-sign.js
import { strict as assert } from 'assert';
import crypto from 'crypto';
import { EOS_QUANTITY_PRECISION } from 'eos-utils';
import { privateToPublic, sign, signHash } from 'eosjs-ecc';
import Long from 'long';
import { all, create } from 'mathjs';
import { USER_CONFIG } from '../config';

const math = create(all, {
  number: 'BigNumber',
  precision: 64,
});

const WHALEEX_EOS_ACCOUNT = 'whaleexchang';

function defaultHandler(params: Params): Params {
  return {
    timestamp: Date.now(),
    APIKey: USER_CONFIG.WHALEEX_API_KEY!,
    pk: privateToPublic(USER_CONFIG.eosPrivateKey!),
    ...params,
  };
}

export type Params = { [key: string]: string | number | boolean };
type Handler = (params: Params) => Params;

const HANDLER: { [key: string]: Handler } = {
  '/api/v1/order/orders': defaultHandler,
  '/api/auth/pk/status': (params: Params) => {
    return {
      pk: privateToPublic(USER_CONFIG.eosPrivateKey!),
      ...params,
    };
  },
  '/api/v1/order/matchresults': defaultHandler,
  default: defaultHandler,
};

// Pack all kinds of data into a binary buffer.
class Packer {
  private buf: Buffer = Buffer.alloc(0);

  public updateStr(str: string): Packer {
    this.buf = Buffer.concat([this.buf, Buffer.from(str)]);
    return this;
  }

  public updateInt8(i: number): Packer {
    const tmp = Buffer.alloc(1);
    tmp.writeInt8(i, 0);
    this.buf = Buffer.concat([this.buf, tmp]);
    return this;
  }

  public updateInt16(i: number): Packer {
    const tmp = Buffer.alloc(2);
    tmp.writeInt16LE(i, 0);
    this.buf = Buffer.concat([this.buf, tmp]);
    return this;
  }

  public updateInt32(i: number): Packer {
    const tmp = Buffer.alloc(4);
    tmp.writeInt32LE(i, 0);
    this.buf = Buffer.concat([this.buf, tmp]);
    return this;
  }

  public updateInt64(str: string): Packer {
    const long = Long.fromString(str, 10);
    this.buf = Buffer.concat([this.buf, Buffer.from(long.toBytesLE())]);
    return this;
  }

  public finalize(): Buffer {
    return this.buf;
  }

  public clear(): void {
    this.buf = Buffer.alloc(0);
  }
}

function getHandle(path: string): Handler {
  return HANDLER[path] || HANDLER.default;
}

function getHash() {
  return crypto.createHash('sha256');
}

function multiply(m: number, n: number, decimal: number, ceil: boolean = false): string {
  const result = math.evaluate!(`${m} * ${n} * ${10 ** decimal}`);
  if (ceil) {
    return String(Math.ceil(result));
  }
  return String(result).split('.')[0];
}

export function getKeys() {
  assert.ok(USER_CONFIG.eosPrivateKey);
  assert.ok(USER_CONFIG.WHALEEX_API_KEY);

  return {
    privateKey: USER_CONFIG.eosPrivateKey,
    publicKey: privateToPublic(USER_CONFIG.eosPrivateKey!),
    APIKey: USER_CONFIG.WHALEEX_API_KEY,
  };
}

export interface SymbolObj {
  baseToken: string;
  quoteToken: string;
  basePrecision: number;
  quotePrecision: number;
  baseContract: string;
  quoteContract: string;
}

export interface WhaleExOrder {
  orderId: string;
  amount: string;
  price: string;
  symbol: string;
  type: 'buy-limit' | 'sell-limit' | 'buy-market' | 'sell-market';
}

export function signOrder(post: WhaleExOrder, timestamp: number, symbolObj: SymbolObj) {
  const {
    baseToken = 'IQ',
    quoteToken = 'EOS',
    basePrecision = 3,
    quotePrecision = EOS_QUANTITY_PRECISION,
    baseContract,
    quoteContract,
  } = symbolObj;
  // "IQ/EOS for example"
  const pack = new Packer();
  pack
    .updateStr(USER_CONFIG.eosAccount!)
    .updateStr(WHALEEX_EOS_ACCOUNT)
    .updateInt64(post.orderId.toString())
    .updateInt32(Math.floor(timestamp / 1000));
  const price = parseFloat(post.price);
  const quantity = parseFloat(post.amount);
  if (post.type === 'buy-limit') {
    pack
      .updateStr(quoteContract)
      .updateStr(quoteToken)
      .updateInt64(multiply(price, quantity, quotePrecision, true))
      .updateStr(baseContract)
      .updateStr(baseToken)
      .updateInt64(multiply(1, quantity, basePrecision));
  }
  if (post.type === 'sell-limit') {
    pack
      .updateStr(baseContract)
      .updateStr(baseToken)
      .updateInt64(multiply(1, quantity, basePrecision))
      .updateStr(quoteContract)
      .updateStr(quoteToken)
      .updateInt64(multiply(price, quantity, quotePrecision));
  }
  if (post.type === 'buy-market') {
    pack
      .updateStr(quoteContract)
      .updateStr(quoteToken)
      .updateInt64(multiply(1, quantity, quotePrecision))
      .updateStr(baseContract)
      .updateStr(baseToken)
      .updateInt64('0');
  }
  if (post.type === 'sell-market') {
    pack
      .updateStr(baseContract)
      .updateStr(baseToken)
      .updateInt64(multiply(1, quantity, basePrecision))
      .updateStr(quoteContract)
      .updateStr(quoteToken)
      .updateInt64('0');
  }
  pack.updateInt16(10).updateInt16(10);

  const buf = pack.finalize();
  const hashData = getHash()
    .update(buf)
    .digest('hex');
  const { privateKey } = getKeys();
  const sig = signHash(hashData, privateKey!);
  return sig;
}

export function sort(params: Params): string {
  const sb: string[] = []; // String buffer
  const keys = Object.keys(params).sort();
  keys.forEach(key => {
    sb.push(`${key}=${params[key]}`);
  });
  return sb.join('&');
}

export function signData(method: 'GET' | 'POST', path: string, params: Params = {}) {
  const { privateKey } = getKeys();
  // console.log("signData", method, path, params);
  const paramsStr = sort(getHandle(path)(params));
  const data = `${method.toUpperCase()}\napi.whaleex.com\n${path}\n${encodeURIComponent(
    paramsStr,
  )}`;
  const signature = sign(data, privateKey!);
  return `${paramsStr}&Signature=${signature}`;
}

export function signDataOrder(order: WhaleExOrder, symbolObj: SymbolObj) {
  const { APIKey, publicKey } = getKeys();
  const map = {
    APIKey: APIKey!,
    timestamp: Date.now(),
    pk: publicKey!,
    orderId: order.orderId,
  };
  const paramsText = sort(map);
  const signature = signOrder(order, map.timestamp, symbolObj);
  return `${paramsText}&Signature=${signature}`;
}
