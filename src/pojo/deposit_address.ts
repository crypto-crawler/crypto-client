export interface DepositAddress {
  symbol: string;
  address: string;
  memo?: string;
  subtype?: 'ERC20' | 'TRC20' | 'OMNI' | 'AAC' | 'BEP2'; // e.g., USDT has three subtypes, default to OMNI
}
