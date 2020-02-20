export interface WithdrawalFee {
  symbol: string;
  platform: string; // e.g., USDT has OMNI, ERC20, TRC20 and EOS
  fee: number; // withdrawal fee
  min: number; // min withdrawal amount
}
