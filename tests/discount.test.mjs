import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscount } from '../src/discount.mjs';

test('discount applies the percentage without rounding to cents', () => {
  assert.equal(applyDiscount(200, 25), 150);
  assert.equal(applyDiscount(12.345, 10), 12.345 * (1 - 10 / 100));
});

test('discount handles zero and full percentages and zero amounts', () => {
  assert.equal(applyDiscount(200, 0), 200);
  assert.equal(applyDiscount(200, 100), 0);
  for (const percent of [0, 25, 100]) assert.equal(applyDiscount(0, percent), 0);
});

test('discount rejects invalid amounts with RangeError', () => {
  for (const amount of [-1, NaN, Infinity, -Infinity, '200', null, undefined, true]) {
    assert.throws(() => applyDiscount(amount, 25), RangeError);
  }
});

test('discount rejects invalid percentages with RangeError', () => {
  for (const percent of [-1, 101, NaN, Infinity, -Infinity, '25', null, undefined, true]) {
    assert.throws(() => applyDiscount(200, percent), RangeError);
  }
});
