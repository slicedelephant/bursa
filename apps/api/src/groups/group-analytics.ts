/**
 * E18 Groups — pure group analytics + portfolio aggregator. This is a THIN wrapper
 * over the E16 gamification primitive `aggregateContributions`: it folds the group's
 * money-free contribution mirrors into totals (sum, count, distinct campaigns,
 * impact per campaign) and enriches them with member count, goal progress and the
 * active ISO week. It does NOT re-implement aggregation — the E16 portfolio core is
 * reused. `now` is injected (no `Date.now()`), so it is deterministic. No I/O, no
 * mutation.
 */

import {
  ContributionInput,
  aggregateContributions,
} from '../gamification/cumulative.util';

export interface AnalyticsInput {
  readonly contributions: ReadonlyArray<ContributionInput>;
  readonly memberCount: number;
  readonly goalCents: number;
  readonly now: Date | string;
}

export interface GroupAnalytics {
  readonly totalCents: number;
  readonly contributionCount: number;
  readonly distinctTargets: number;
  readonly impactPerTargetCents: number;
  readonly memberCount: number;
  /** Integer percent of the shared goal reached, capped at 100. */
  readonly goalPercent: number;
  /** ISO week label of the injected reference date, e.g. "2026-W26". */
  readonly activeWeek: string;
}

/** ISO-8601 week label ("YYYY-Www") of a date. Deterministic; no Date.now(). */
export function isoWeek(value: Date | string): string {
  const d = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  // Shift to the nearest Thursday (ISO weeks belong to the year of their Thursday).
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week =
    1 +
    Math.round(
      (d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function buildGroupAnalytics(input: AnalyticsInput): GroupAnalytics {
  const stats = aggregateContributions(input.contributions);
  const goalCents = Math.max(0, input.goalCents);
  const goalPercent =
    goalCents === 0
      ? 0
      : Math.min(100, Math.floor((stats.totalCents / goalCents) * 100));
  return {
    totalCents: stats.totalCents,
    contributionCount: stats.contributionCount,
    distinctTargets: stats.distinctTargets,
    impactPerTargetCents: stats.impactPerTargetCents,
    memberCount: Math.max(0, input.memberCount),
    goalPercent,
    activeWeek: isoWeek(input.now),
  };
}
