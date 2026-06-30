import { TrendDelta } from '../../core/models';

/**
 * Pure presentation helpers for the year-over-year trend chart. No I/O; returns
 * new values, never mutates inputs.
 */

export type TrendDirection = 'up' | 'down' | 'flat';

export function direction(delta: number): TrendDirection {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

/** Arrow glyph for a delta direction. */
export function deltaArrow(delta: number): string {
  switch (direction(delta)) {
    case 'up':
      return '▲';
    case 'down':
      return '▼';
    default:
      return '–';
  }
}

/** Tailwind colour class for a delta (up = positive/green here, as more impact). */
export function deltaClass(delta: number): string {
  switch (direction(delta)) {
    case 'up':
      return 'text-emerald-600';
    case 'down':
      return 'text-brand-orange';
    default:
      return 'text-slate2';
  }
}

/** Signed, formatted delta label, e.g. "+45,000.0" or "-3". */
export function signed(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('en-US')}`;
}

/** One-line summary of a year's delta for screen readers / tooltips. */
export function deltaSummary(delta: TrendDelta): string {
  return `${delta.year}: invested ${signed(delta.investedEurDelta)} EUR, scholars ${signed(
    delta.scholarCountDelta,
  )}, female share ${signed(delta.femaleShareDeltaPct)} pp`;
}
