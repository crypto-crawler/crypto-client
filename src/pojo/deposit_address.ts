export declare const SUB_TYPES: readonly ['AAC', 'BEP2', 'EOS', 'ERC20', 'OMNI', 'TRC20', 'WTC'];
export declare type SubType = typeof SUB_TYPES[number];

export interface DepositAddress {
  symbol: string;
  address: string;
  memo?: string;
  subtype?: SubType; // e.g., USDT has three subtypes
}
