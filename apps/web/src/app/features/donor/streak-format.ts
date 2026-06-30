import { BadgeProgress, BadgeTier, StreakState } from '../../core/models';

/** Pure presentation helpers for the donor giving-streak + badge. No I/O; returns
 * new strings, never mutates inputs. */

const TIER_LABEL: Record<BadgeTier, string> = {
  NONE: 'No badge yet',
  BRONZE: 'Bronze giver',
  SILVER: 'Silver giver',
  GOLD: 'Gold giver',
};

const TIER_COLOR: Record<BadgeTier, string> = {
  NONE: 'bg-slate-100 text-slate2',
  BRONZE: 'bg-orange-100 text-orange-700',
  SILVER: 'bg-slate-200 text-slate-700',
  GOLD: 'bg-amber-100 text-amber-700',
};

export function streakText(streak: StreakState): string {
  const n = streak.currentMonths;
  if (n <= 0) return 'Start your giving streak this month';
  return `${n} month${n === 1 ? '' : 's'} in a row`;
}

export function badgeLabel(badge: BadgeProgress): string {
  return TIER_LABEL[badge.tier];
}

export function badgeColorClass(badge: BadgeProgress): string {
  return TIER_COLOR[badge.tier];
}

export function nextMilestoneText(badge: BadgeProgress): string {
  if (!badge.nextTier || badge.monthsToNextTier === null) {
    return 'Top tier reached — keep it going!';
  }
  const n = badge.monthsToNextTier;
  return `${n} month${n === 1 ? '' : 's'} to ${TIER_LABEL[badge.nextTier]}`;
}
