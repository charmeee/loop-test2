import test from 'node:test';
import assert from 'node:assert/strict';
import { roundMoney } from '../src/money.mjs';
import { quoteTotal } from '../src/quote.mjs';
test('ordinary money values round to cents', () => assert.equal(roundMoney(12.345), 12.35));
test('money rejects non-finite inputs', () => {
  for (const value of [NaN, Infinity, '12']) assert.throws(() => roundMoney(value), TypeError);
});
test('quote totals valid amounts and empty lists', () => {
  assert.equal(quoteTotal([10,20,12.5]),42.5);
  assert.equal(quoteTotal([]),0);
});
test('quote rejects invalid amounts', () => {
  for (const values of [[-1],[NaN],['10'],null]) assert.throws(() => quoteTotal(values), TypeError);
});
