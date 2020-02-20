export interface DepositAddress {
  symbol: string;
  platform: string; // e.g., USDT has OMNI, ERC20, TRC20 and EOS
  address: string;
  memo?: string;
  fee?: number;
  max_deposit_amount?: number;
  min_deposit_amount?: number;
}
