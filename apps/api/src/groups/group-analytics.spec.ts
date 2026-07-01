import { buildGroupAnalytics, isoWeek } from './group-analytics';

describe('isoWeek', () => {
  it('labels a mid-year date with its ISO week', () => {
    // 2026-06-25 is in ISO week 26.
    expect(isoWeek('2026-06-25T12:00:00.000Z')).toBe('2026-W26');
  });

  it('is deterministic for the same reference date', () => {
    const ref = new Date('2026-01-05T00:00:00.000Z'); // ISO week 2 of 2026
    expect(isoWeek(ref)).toBe(isoWeek(ref));
    expect(isoWeek(ref)).toBe('2026-W02');
  });

  it('does not mutate a Date input', () => {
    const ref = new Date('2026-06-25T12:00:00.000Z');
    const before = ref.getTime();
    isoWeek(ref);
    expect(ref.getTime()).toBe(before);
  });
});

describe('buildGroupAnalytics', () => {
  const now = new Date('2026-06-25T12:00:00.000Z');

  it('folds contributions via the E16 primitive and enriches them', () => {
    const result = buildGroupAnalytics({
      contributions: [
        { targetId: 'c_amara', valueCents: 300_000, at: '2026-05-01' },
        { targetId: 'c_ben', valueCents: 200_000, at: '2026-06-01' },
        { targetId: 'c_amara', valueCents: 100_000, at: '2026-06-10' },
      ],
      memberCount: 4,
      goalCents: 1_000_000,
      now,
    });
    expect(result.totalCents).toBe(600_000);
    expect(result.contributionCount).toBe(3);
    expect(result.distinctTargets).toBe(2);
    expect(result.impactPerTargetCents).toBe(300_000);
    expect(result.memberCount).toBe(4);
    expect(result.goalPercent).toBe(60);
    expect(result.activeWeek).toBe('2026-W26');
  });

  it('caps goalPercent at 100 and handles a zero goal', () => {
    expect(
      buildGroupAnalytics({
        contributions: [{ targetId: 'c', valueCents: 2000, at: now }],
        memberCount: 1,
        goalCents: 1000,
        now,
      }).goalPercent,
    ).toBe(100);
    expect(
      buildGroupAnalytics({
        contributions: [{ targetId: 'c', valueCents: 2000, at: now }],
        memberCount: 1,
        goalCents: 0,
        now,
      }).goalPercent,
    ).toBe(0);
  });

  it('handles an empty group', () => {
    const result = buildGroupAnalytics({
      contributions: [],
      memberCount: 0,
      goalCents: 1000,
      now,
    });
    expect(result.totalCents).toBe(0);
    expect(result.contributionCount).toBe(0);
    expect(result.memberCount).toBe(0);
  });

  it('clamps a negative member count to 0', () => {
    const result = buildGroupAnalytics({
      contributions: [],
      memberCount: -3,
      goalCents: 0,
      now,
    });
    expect(result.memberCount).toBe(0);
  });
});
