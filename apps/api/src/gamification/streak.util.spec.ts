import { computeMonthlyStreak } from './streak.util';

describe('computeMonthlyStreak', () => {
  it('returns an empty streak for no activity', () => {
    const res = computeMonthlyStreak([], '2026-06-15');
    expect(res).toEqual({
      currentMonths: 0,
      longestMonths: 0,
      currentMonthCovered: false,
      lastActiveMonth: null,
    });
  });

  it('counts consecutive months up to the reference month', () => {
    const res = computeMonthlyStreak(
      ['2026-04-03', '2026-05-10', '2026-06-01'],
      '2026-06-20',
    );
    expect(res.currentMonths).toBe(3);
    expect(res.longestMonths).toBe(3);
    expect(res.currentMonthCovered).toBe(true);
    expect(res.lastActiveMonth).toBe('2026-06');
  });

  it('deduplicates multiple donations in the same month', () => {
    const res = computeMonthlyStreak(
      ['2026-06-01', '2026-06-09', '2026-06-28'],
      '2026-06-30',
    );
    expect(res.currentMonths).toBe(1);
    expect(res.currentMonthCovered).toBe(true);
  });

  it('keeps the streak alive when only the previous month is covered (grace)', () => {
    const res = computeMonthlyStreak(
      ['2026-04-05', '2026-05-12'],
      '2026-06-10',
    );
    expect(res.currentMonths).toBe(2);
    expect(res.currentMonthCovered).toBe(false);
  });

  it('breaks the current streak after a gap but keeps the longest', () => {
    const res = computeMonthlyStreak(
      ['2026-01-02', '2026-02-02', '2026-03-02', '2026-06-02'],
      '2026-06-15',
    );
    expect(res.currentMonths).toBe(1);
    expect(res.longestMonths).toBe(3);
    expect(res.lastActiveMonth).toBe('2026-06');
  });

  it('treats a streak ending two months ago as broken (current 0)', () => {
    const res = computeMonthlyStreak(
      ['2026-03-02', '2026-04-02'],
      '2026-06-15',
    );
    expect(res.currentMonths).toBe(0);
    expect(res.longestMonths).toBe(2);
    expect(res.currentMonthCovered).toBe(false);
  });

  it('accepts Date objects and crosses year boundaries', () => {
    const res = computeMonthlyStreak(
      [new Date('2025-11-10'), new Date('2025-12-10'), new Date('2026-01-10')],
      new Date('2026-01-31'),
    );
    expect(res.currentMonths).toBe(3);
    expect(res.lastActiveMonth).toBe('2026-01');
  });

  it('does not mutate the input array', () => {
    const input = ['2026-05-01', '2026-04-01'];
    const copy = [...input];
    computeMonthlyStreak(input, '2026-05-15');
    expect(input).toEqual(copy);
  });
});
