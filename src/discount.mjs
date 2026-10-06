export function applyDiscount(amount, percent) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError('non-negative finite amount required');
  }
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError('finite percent between 0 and 100 required');
  }
  return amount * (1 - percent / 100);
}
