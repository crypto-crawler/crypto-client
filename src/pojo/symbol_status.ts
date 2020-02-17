export interface SymbolStatus {
  symbol: string;
  trading: boolean;
  deposit_enabled: boolean;
  withdrawal_enabled: boolean;
  chain?: string;
}
