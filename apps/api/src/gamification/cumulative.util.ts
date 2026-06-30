/**
 * Pure cumulative-stats aggregator — a generic gamification primitive. Folds a list
 * of generic `{ targetId, valueCents, at }` contributions into totals: sum, count,
 * distinct targets, integer impact per target, and the first/last active month.
 * No I/O; returns new values; never mutates inputs. The donor portfolio (E16) feeds
 * donations; E15/E18 can feed referral/group contributions the same way.
 */

export interface ContributionInput {
  readonly targetId: string;
  readonly valueCents: number;
  readonly at: Date | string;
}

export interface CumulativeStats {
  readonly totalCents: number;
  readonly contributionCount: number;
  readonly distinctTargets: number;
  readonly impactPerTargetCents: number;
  readonly firstMonth: string | null;
  readonly lastMonth: string | null;
}

function monthKey(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function aggregateContributions(
  items: ReadonlyArray<ContributionInput>,
): CumulativeStats {
  if (items.length === 0) {
    return {
      totalCents: 0,
      contributionCount: 0,
      distinctTargets: 0,
      impactPerTargetCents: 0,
      firstMonth: null,
      lastMonth: null,
    };
  }

  const totalCents = items.reduce((sum, item) => sum + item.valueCents, 0);
  const distinctTargets = new Set(items.map((item) => item.targetId)).size;
  const months = items.map((item) => monthKey(item.at)).sort();

  return {
    totalCents,
    contributionCount: items.length,
    distinctTargets,
    impactPerTargetCents:
      distinctTargets === 0 ? 0 : Math.floor(totalCents / distinctTargets),
    firstMonth: months[0],
    lastMonth: months[months.length - 1],
  };
}
