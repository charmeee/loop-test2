export function roundMoney(value) {
  if (!Number.isFinite(value)) throw new TypeError('finite number required');
  const [coefficient, exponent = '0'] = Math.abs(value).toString().split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const shift = Number(exponent) - fraction.length + 2;

  // Values already expressed in whole cents need no scaling, avoiding overflow.
  if (shift >= 0) return value === 0 ? 0 : value;

  const digits = BigInt(whole + fraction);
  const divisor = 10n ** BigInt(-shift);
  let cents = digits / divisor;
  if ((digits % divisor) * 2n >= divisor) cents += 1n;
  if (cents === 0n) return 0;

  const rounded = Number(`${cents}e-2`);
  return value < 0 ? -rounded : rounded;
}
