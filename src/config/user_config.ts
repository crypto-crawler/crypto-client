export interface UserConfig {
  eosAccount?: string;
  eosPrivateKey?: string;
  eosApiEndpoints?: string[];
  ethPrivateKey?: string;
  BINANCE_API_KEY?: string;
  BINANCE_API_SECRET?: string;
  BITFINEX_API_KEY?: string;
  BITFINEX_API_SECRET?: string;
  BITSTAMP_API_KEY?: string;
  BITSTAMP_API_SECRET?: string;
  BITSTAMP_USER_ID?: number;
  COINBASE_ACCESS_KEY?: string;
  COINBASE_ACCESS_SECRET?: string;
  COINBASE_ACCESS_PASSPHRASE?: string;
  DFUSE_API_KEY?: string;
  HUOBI_ACCESS_KEY?: string;
  HUOBI_SECRET_KEY?: string;
  HUOBI_ACCOUNT_ID?: number;
  KRAKEN_API_KEY?: string;
  KRAKEN_PRIVATE_KEY?: string;
  MXC_ACCESS_KEY?: string;
  MXC_SECRET_KEY?: string;
  OKEX_SPOT_API_KEY?: string;
  OKEX_SPOT_API_SECRET?: string;
  OKEX_SPOT_API_PASSPHRASE?: string;
  OKEX_SPOT_FUND_PASSWORD?: string;
  WHALEEX_API_KEY?: string;
  WHALEEX_USER_ID?: string;
}

// Should be initialized by init().
export const USER_CONFIG: UserConfig = {};
