/**
 * Money arithmetic in one place.
 *
 * Every amount is stored as a major-unit `Number` until the minor-unit
 * migration lands, so each calculation has to round exactly once at the edge.
 * Ad-hoc `Math.round(value * 100) / 100` calls drift apart when one path rounds
 * line items and another rounds the total; these helpers keep the rounding rule
 * identical everywhere and make the eventual move to integer paisa a single
 * import change.
 */

/** Rounds to the nearest paisa (two decimal places). */
export const roundMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/** Major units to integer minor units (paisa). */
export const toMinor = (value: number): number => Math.round((value + Number.EPSILON) * 100);

/** Integer minor units back to major units. */
export const fromMinor = (minor: number): number => minor / 100;

/** Sums already-rounded line amounts without accumulating float drift. */
export const sumMoney = (values: Iterable<number>): number => {
  let minor = 0;
  for (const value of values) minor += toMinor(value);
  return fromMinor(minor);
};

/** Adds amounts, rounding the result once. */
export const addMoney = (...values: number[]): number => sumMoney(values);

/** True when two amounts agree to the paisa. */
export const sameMoney = (a: number, b: number): boolean => toMinor(a) === toMinor(b);
