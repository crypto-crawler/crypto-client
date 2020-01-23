export declare const SUB_TYPES: readonly ['ERC20', 'TRC20', 'OMNI', 'AAC', 'BEP2'];
export declare type SubType = typeof SUB_TYPES[number];

export interface DepositAddress {
  symbol: string;
  address: string;
  memo?: string;
  subtype?: SubType; // e.g., USDT has three subtypes
}
