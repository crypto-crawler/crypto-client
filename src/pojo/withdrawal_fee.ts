import { SubType } from './deposit_address';

export interface WithdrawalFee {
  symbol: string;
  withdrawal_fee: number;
  min_withdraw_amount: number;
  subtype?: SubType; // e.g., USDT has three subtypes
}
