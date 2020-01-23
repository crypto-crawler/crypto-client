export declare const CURRENCY_NETWORKS: readonly ['ERC20', 'TRC20', 'OMNI', 'AAC', 'BEP2'];
export declare type CurrencyNetwork = typeof CURRENCY_NETWORKS[number];

export interface DepositAddress {
  symbol: string;
  address: string;
  memo?: string;
  network?: CurrencyNetwork; // e.g., USDT has three subtypes, default to OMNI
}
