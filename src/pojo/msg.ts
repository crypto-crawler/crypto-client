/* eslint-disable camelcase */
export interface OrderMsg {
  exchange: string;
  pair: string;
  price: string;
  quantity: string;
  type: boolean; // true, sell-limit; false, buy-limit
}

export interface NewdexOrder {
  type: string;
  symbol: string;
  price: string;
  channel?: string;
  ref?: string;
}

export interface NewdexOrderResponse {
  pair_id: number;
  order_id: number;
  owner: string;
  type: string; // "sell-limit", "buy-limit", "sell-market", "buy-market"
  pair_symbol: string;
  price: string;
  quantity: string;
  amount: string;
  condition_price: string;
  is_plan: boolean;
  channel?: string;
  ref?: string;
  base_symbol: {
    contract: string;
    sym: string;
  };
  quote_symbol: {
    contract: string;
    sym: string;
  };
}
