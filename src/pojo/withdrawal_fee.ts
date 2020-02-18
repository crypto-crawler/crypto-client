export interface WithdrawalFee {
  symbol: string;
  platform: string; //  e.g., USDT has Omni, Ethereum, TRON and EOS
  withdrawal_fee: number;
  min_withdraw_amount: number;
}
