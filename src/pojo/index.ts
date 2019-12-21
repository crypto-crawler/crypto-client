import { Serialize } from 'eosjs';

export * from './msg';

export interface ActionExtended {
  exchange: string;
  action: Serialize.Action;
  orderId?: string;
}
