export interface Currency {
  symbol: string;
  active: boolean;
  // TODO: precision: number;
  depositEnabled: boolean;
  withdrawalEnabled: boolean;
}
