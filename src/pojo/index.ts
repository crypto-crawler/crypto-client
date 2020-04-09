import { Serialize } from 'eosjs';

export { Currency } from './currency';
export { DepositAddress } from './deposit_address';
export * from './msg';
export { WithdrawalFee } from './withdrawal_fee';

export interface ActionExtended {
  exchange: string;
  action: Serialize.Action;
  orderId?: string;
}
