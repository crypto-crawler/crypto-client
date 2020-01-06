export interface UserConfig {
  eosAccount?: string;
  eosPrivateKey?: string;
  eosApiEndpoints?: string[];
  ethPrivateKey?: string;
  whaleExApiKey?: string;
  CB_ACCESS_KEY?: string;
  CB_ACCESS_SECRET?: string;
  CB_ACCESS_PASSPHRASE?: string;
  BINANCE_API_KEY?: string;
  BINANCE_API_SECRET?: string;
  BITFINEX_API_KEY?: string;
  BITFINEX_API_SECRET?: string;
  BITSTAMP_API_KEY?: string;
  BITSTAMP_API_SECRET?: string;
  BITSTAMP_USER_ID?: number;
  HUOBI_ACCESS_KEY?: string;
  HUOBI_SECRET_KEY?: string;
  HUOBI_ACCOUNT_ID?: number;
  KRAKEN_API_KEY?: string;
  KRAKEN_PRIVATE_KEY?: string;
  MXCAccessKey?: string;
  MXCSecretKey?: string;
  OKEX_SPOT_API_KEY?: string;
  OKEX_SPOT_API_SECRET?: string;
  OKEX_SPOT_API_PASSPHRASE?: string;
}

// Should be initialized by init().
export const USER_CONFIG: UserConfig = {};
