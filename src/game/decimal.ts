import Decimal from 'break_infinity.js';

/**
 * Central Decimal facade.
 *
 * The whole game runs on `break_infinity.js` so that production can climb past
 * the ~1.8e308 ceiling of a native double without turning into `Infinity`.
 * Every module imports the `Decimal` class from here, so we could swap the
 * underlying library (e.g. to `break_eternity.js`) in exactly one place.
 */
export { Decimal };

export type DecimalSource = Decimal | number | string;

/** Terse constructor. `D(10)`, `D('1e42')`, `D(other)`. */
export function D(value: DecimalSource = 0): Decimal {
  return new Decimal(value);
}

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);
export const TEN = new Decimal(10);

export function max(a: DecimalSource, b: DecimalSource): Decimal {
  return Decimal.max(a, b);
}

export function min(a: DecimalSource, b: DecimalSource): Decimal {
  return Decimal.min(a, b);
}

/** Sum a list of Decimal sources without intermediate garbage in call sites. */
export function sum(values: DecimalSource[]): Decimal {
  let acc = new Decimal(0);
  for (const v of values) acc = acc.add(v);
  return acc;
}

/** Clamp helper used by progress bars and efficiency factors. */
export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}
