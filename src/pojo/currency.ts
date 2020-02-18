export interface Currency {
  symbol: string;
  trading: boolean;
  // TODO: precision: number;
  // platform -> enabled
  deposit: {
    [key: string]: { platform: string; enabled: boolean; fee?: number; min?: number; max?: number };
  };
  withdrawal: {
    [key: string]: { platform: string; enabled: boolean; fee: number; min: number; max?: number };
  };
}
