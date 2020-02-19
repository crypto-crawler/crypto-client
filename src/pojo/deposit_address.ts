export interface DepositAddress {
  symbol: string;
  platform: string; // e.g., USDT has Omni, Ethereum, TRON and EOS
  address: string;
  memo?: string;
  fee?: number;
  max_deposit_amount?: number;
  min_deposit_amount?: number;
}
