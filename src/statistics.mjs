export function summarizeAmounts(amounts) {
  if (!Array.isArray(amounts)) throw new TypeError('array of finite numbers required');

  let total = 0;
  for (let index = 0; index < amounts.length; index += 1) {
    if (!Object.hasOwn(amounts, index) || !Number.isFinite(amounts[index])) {
      throw new TypeError('array of finite numbers required');
    }
    total += amounts[index];
  }

  const count = amounts.length;
  return { count, total, average: count === 0 ? 0 : total / count };
}
