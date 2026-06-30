import { BadgeProgress, StreakState } from '../../core/models';
import { badgeColorClass, badgeLabel, nextMilestoneText, streakText } from './streak-format';

const streak = (over: Partial<StreakState> = {}): StreakState => ({
  currentMonths: 0,
  longestMonths: 0,
  currentMonthCovered: false,
  lastActiveMonth: null,
  ...over,
});

const badge = (over: Partial<BadgeProgress> = {}): BadgeProgress => ({
  tier: 'NONE',
  streakMonths: 0,
  nextTier: 'BRONZE',
  monthsToNextTier: 3,
  ...over,
});

describe('streakText', () => {
  it('prompts a start when there is no streak', () => {
    expect(streakText(streak())).toBe('Start your giving streak this month');
  });
  it('uses singular for one month', () => {
    expect(streakText(streak({ currentMonths: 1 }))).toBe('1 month in a row');
  });
  it('uses plural for many months', () => {
    expect(streakText(streak({ currentMonths: 7 }))).toBe('7 months in a row');
  });
});

describe('badgeLabel', () => {
  it('labels each tier', () => {
    expect(badgeLabel(badge({ tier: 'NONE' }))).toBe('No badge yet');
    expect(badgeLabel(badge({ tier: 'BRONZE' }))).toBe('Bronze giver');
    expect(badgeLabel(badge({ tier: 'SILVER' }))).toBe('Silver giver');
    expect(badgeLabel(badge({ tier: 'GOLD' }))).toBe('Gold giver');
  });
});

describe('badgeColorClass', () => {
  it('returns a distinct class per tier', () => {
    const none = badgeColorClass(badge({ tier: 'NONE' }));
    const gold = badgeColorClass(badge({ tier: 'GOLD' }));
    expect(none).not.toBe(gold);
    expect(gold).toContain('amber');
  });
});

describe('nextMilestoneText', () => {
  it('describes the next badge and distance', () => {
    expect(nextMilestoneText(badge({ nextTier: 'GOLD', monthsToNextTier: 5 }))).toBe(
      '5 months to Gold giver',
    );
  });
  it('uses singular for one month to go', () => {
    expect(nextMilestoneText(badge({ nextTier: 'SILVER', monthsToNextTier: 1 }))).toBe(
      '1 month to Silver giver',
    );
  });
  it('celebrates the top tier', () => {
    expect(nextMilestoneText(badge({ tier: 'GOLD', nextTier: null, monthsToNextTier: null }))).toBe(
      'Top tier reached — keep it going!',
    );
  });
});
