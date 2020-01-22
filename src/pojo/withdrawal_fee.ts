export interface WithdrawalFee {
  symbol: string;
  deposit_enabled: boolean;
  withdraw_enabled: boolean;
  withdrawal_fee: number;
  min_withdraw_amount: number;
}
