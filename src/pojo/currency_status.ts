export interface CurrencyStatus {
  symbol: string;
  deposit_enabled: { [key: string]: boolean };
  withdrawal_enabled: { [key: string]: boolean };
  trading?: boolean;
}
