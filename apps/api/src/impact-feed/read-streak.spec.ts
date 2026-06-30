import { computeReadStreak } from './read-streak';

describe('computeReadStreak', () => {
  it('returns an empty streak when there are no reads', () => {
    const res = computeReadStreak([], '2026-06-15');
    expect(res.currentMonths).toBe(0);
    expect(res.lastActiveMonth).toBeNull();
  });

  it('counts consecutive months of feed-reading via the E16 primitive', () => {
    const res = computeReadStreak(
      ['2026-04-03', '2026-05-10', '2026-06-01'],
      '2026-06-20',
    );
    expect(res.currentMonths).toBe(3);
    expect(res.currentMonthCovered).toBe(true);
    expect(res.lastActiveMonth).toBe('2026-06');
  });

  it('accepts Date objects and an injected reference date', () => {
    const res = computeReadStreak(
      [new Date('2026-05-01'), new Date('2026-06-01')],
      new Date('2026-06-30'),
    );
    expect(res.currentMonths).toBe(2);
  });

  it('does not mutate the input array', () => {
    const input = ['2026-06-01', '2026-05-01'];
    const copy = [...input];
    computeReadStreak(input, '2026-06-15');
    expect(input).toEqual(copy);
  });
});
