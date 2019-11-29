/* eslint-disable max-classes-per-file */
// TODO: use bp node directly
import { strict as assert } from 'assert';
import axios from 'axios';
import { NewdexOrderResponse } from '../pojo';

export default class Bloks {
  private static async getTransaction(transactionId: string): Promise<any> {
    const url = `https://www.api.bloks.io/dfuse?type=fetch_transaction&id=${transactionId}`;
    const response = await axios.get(url);
    assert.equal(response.status, 200);
    assert.equal(response.statusText, 'OK');
    return response.data;
  }

  private static extractOrderResponse(transaction: any): NewdexOrderResponse {
    assert.equal(transaction.transaction_status, 'executed');
    assert.ok(transaction.id);
    assert.ok(transaction.execution_trace);
    assert.ok(transaction.execution_trace);
    assert.equal(transaction.execution_trace.action_traces.length, 1);
    assert.equal(transaction.execution_trace.action_traces[0].inline_traces.length, 3);
    return transaction.execution_trace.action_traces[0].inline_traces[2].act
      .data as NewdexOrderResponse;
  }

  public static async getOrderId(
    transactionId: string,
  ): Promise<{ order_id: number; pair_id: number }> {
    const transaction = await Bloks.getTransaction(transactionId);
    const orderResponse = Bloks.extractOrderResponse(transaction);
    return {
      order_id: orderResponse.order_id,
      pair_id: orderResponse.pair_id,
    };
  }
}
