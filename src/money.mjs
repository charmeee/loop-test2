export function roundMoney(value) {
  if (!Number.isFinite(value)) throw new TypeError('finite number required');
  return Math.round(value * 100) / 100;
}
