export interface WithdrawalFee {
  symbol: string;
  platform: string; //  e.g., USDT has Omni, Ethereum, TRON and EOS
  fee: number; // withdrawal fee
  min: number; // min withdrawal amount
}
