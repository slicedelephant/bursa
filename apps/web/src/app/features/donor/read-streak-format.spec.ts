import { InactivityView, StreakState } from '../../core/models';
import {
  inactivityHeadline,
  lastGaveText,
  readStreakSubtext,
  readStreakText,
} from './read-streak-format';

function streak(partial: Partial<StreakState>): StreakState {
  return {
    currentMonths: 0,
    longestMonths: 0,
    currentMonthCovered: false,
    lastActiveMonth: null,
    ...partial,
  };
}

describe('readStreakText', () => {
  it('prompts a start with no streak', () => {
    expect(readStreakText(streak({}))).toBe('Start your reading streak this month');
  });

  it('pluralises the month count', () => {
    expect(readStreakText(streak({ currentMonths: 1 }))).toBe('1 month of staying in touch');
    expect(readStreakText(streak({ currentMonths: 4 }))).toBe('4 months of staying in touch');
  });
});

describe('readStreakSubtext', () => {
  it('confirms when this month is covered', () => {
    expect(readStreakSubtext(streak({ currentMonthCovered: true }))).toContain('keep it going');
  });

  it('nudges when a streak exists but this month is not covered', () => {
    expect(readStreakSubtext(streak({ currentMonths: 2, currentMonthCovered: false }))).toContain(
      'keep your streak alive',
    );
  });

  it('invites a first read with no streak', () => {
    expect(readStreakSubtext(streak({}))).toContain('first update');
  });
});

describe('inactivityHeadline', () => {
  it('returns the reminder title when due', () => {
    const view: InactivityView = {
      inactive: true,
      daysSince: 100,
      shouldRemind: true,
      reminder: { title: 'Come back', body: 'b', ctaUrl: '/x' },
    };
    expect(inactivityHeadline(view)).toBe('Come back');
  });

  it('returns empty when no reminder is due', () => {
    expect(inactivityHeadline({ inactive: false, daysSince: 1, shouldRemind: false })).toBe('');
  });
});

describe('lastGaveText', () => {
  it('formats the days-since label', () => {
    expect(lastGaveText({ inactive: true, daysSince: 1, shouldRemind: true })).toBe(
      'Your last gift was 1 day ago',
    );
    expect(lastGaveText({ inactive: true, daysSince: 95, shouldRemind: true })).toBe(
      'Your last gift was 95 days ago',
    );
  });

  it('returns empty for a never-donated donor', () => {
    expect(lastGaveText({ inactive: false, daysSince: null, shouldRemind: false })).toBe('');
  });
});
