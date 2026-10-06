import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAmounts } from '../src/statistics.mjs';

test('summarizes amount count, total, and average', () => {
  assert.deepEqual(summarizeAmounts([10, 20, 30]), { count: 3, total: 60, average: 20 });
});

test('empty amounts return zero statistics', () => {
  assert.deepEqual(summarizeAmounts([]), { count: 0, total: 0, average: 0 });
});

test('negative amounts are valid statistics inputs', () => {
  assert.deepEqual(summarizeAmounts([-10, 20]), { count: 2, total: 10, average: 5 });
});

test('statistics do not round fractional amounts', () => {
  assert.deepEqual(summarizeAmounts([0.125, 0.25]), {
    count: 2, total: 0.375, average: 0.1875,
  });
});

test('rejects non-array inputs', () => {
  for (const value of [null, undefined, '10', 10, {}, new Float64Array([10])]) {
    assert.throws(() => summarizeAmounts(value), TypeError);
  }
});

test('rejects non-finite and non-number array entries', () => {
  for (const value of [NaN, Infinity, -Infinity, '10', null, undefined, true, {}, 1n]) {
    assert.throws(() => summarizeAmounts([10, value]), TypeError);
  }
});

test('rejects sparse arrays including inherited entries', () => {
  for (const values of [new Array(2), [10, , 30], [, 10], [10, ,]]) {
    assert.throws(() => summarizeAmounts(values), TypeError);
  }
  const values = new Array(1);
  const prototype = Object.create(Array.prototype);
  prototype[0] = 10;
  Object.setPrototypeOf(values, prototype);
  assert.throws(() => summarizeAmounts(values), TypeError);
});

test('handles frozen arrays without mutating inputs', () => {
  const values = Object.freeze([10, 20, 30]);
  assert.deepEqual(summarizeAmounts(values), { count: 3, total: 60, average: 20 });
  assert.deepEqual(values, [10, 20, 30]);
  assert.deepEqual(summarizeAmounts(Object.freeze([])), { count: 0, total: 0, average: 0 });
});

test('preserves mutable arrays on successful and rejected input', () => {
  const values = [-10, 20];
  summarizeAmounts(values);
  assert.deepEqual(values, [-10, 20]);
  const invalid = [10, '20'];
  assert.throws(() => summarizeAmounts(invalid), TypeError);
  assert.deepEqual(invalid, [10, '20']);
});
