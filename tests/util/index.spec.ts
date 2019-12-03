import { numberToString } from '../../src/util';

test('numberToString()', () => {
  expect(numberToString(0.0019999, 6)).toBe('0.001999');
  expect(numberToString(0.0019999, 5)).toBe('0.00200');
  expect(numberToString(0.001999, 5)).toBe('0.00199');
});
