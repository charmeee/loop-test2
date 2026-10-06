export function quoteTotal(amounts) {
  if (!Array.isArray(amounts) || !amounts.every(value => Number.isFinite(value) && value >= 0)) {
    throw new TypeError('non-negative finite amounts required');
  }
  return amounts.reduce((sum, amount) => sum + amount, 0);
}
