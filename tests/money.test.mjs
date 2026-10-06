import test from 'node:test';
import assert from 'node:assert/strict';
import { roundMoney } from '../src/money.mjs';

test('decimal ties round half away from zero for both signs', () => {
  for (const [value, expected] of [
    [1.005, 1.01],
    [2.675, 2.68],
    [4.015, 4.02],
    [10.075, 10.08],
    [0.005, 0.01],
    [12.345, 12.35],
  ]) {
    assert.equal(roundMoney(value), expected);
    assert.equal(roundMoney(-value), -expected);
  }
});

test('rounding uses the standard decimal string on either side of a tie', () => {
  for (const [value, expected] of [
    [1.0049999999999997, 1],
    [1.0050000000000001, 1.01],
    [0.004999999999999999, 0],
    [0.005000000000000001, 0.01],
    [9.995, 10],
  ]) {
    assert.equal(roundMoney(value), expected);
    assert.equal(roundMoney(-value), expected === 0 ? 0 : -expected);
  }
});

test('tiny scientific values and signed zeros produce positive zero', () => {
  for (const value of [0, -0, 1e-7, -1e-7, Number.MIN_VALUE, -Number.MIN_VALUE]) {
    const result = roundMoney(value);
    assert.equal(result, 0);
    assert.equal(Object.is(result, -0), false);
  }
});

test('large finite scientific values remain unchanged and finite', () => {
  for (const value of [1e21, 1.2345678901234568e25, Number.MAX_VALUE]) {
    for (const signed of [value, -value]) {
      assert.equal(roundMoney(signed), signed);
      assert.equal(Number.isFinite(roundMoney(signed)), true);
    }
  }
});

test('money preserves finite-number input validation', () => {
  for (const value of [NaN, Infinity, -Infinity, '1.005', '', null, undefined, true, {}, 1n]) {
    assert.throws(() => roundMoney(value), {
      name: 'TypeError',
      message: 'finite number required',
    });
  }
});
