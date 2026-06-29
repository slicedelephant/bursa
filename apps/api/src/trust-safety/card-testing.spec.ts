import { detectCardTesting } from './card-testing';

describe('card-testing', () => {
  const now = new Date('2026-06-29T12:00:00.000Z').getTime();

  function attempt(status: string, minutesAgo: number) {
    return { status, createdAt: now - minutesAgo * 60_000 };
  }

  it('returns a clean result for no attempts', () => {
    expect(detectCardTesting([])).toEqual({
      flagged: false,
      score: 0,
      reasons: [],
    });
  });

  it('flags a burst of failed attempts', () => {
    const attempts = [
      attempt('FAILED', 1),
      attempt('FAILED', 2),
      attempt('FAILED', 3),
      attempt('FAILED', 4),
    ];
    const result = detectCardTesting(attempts, now);
    expect(result.flagged).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.startsWith('failed_attempts'))).toBe(
      true,
    );
  });

  it('flags rapid attempts even when some succeed', () => {
    const attempts = [
      attempt('SUCCEEDED', 1),
      attempt('FAILED', 2),
      attempt('FAILED', 3),
      attempt('SUCCEEDED', 4),
      attempt('FAILED', 5),
    ];
    const result = detectCardTesting(attempts, now);
    expect(result.reasons).toContain('rapid_attempts:5');
    expect(result.reasons.some((r) => r.startsWith('high_failure_ratio'))).toBe(
      true,
    );
  });

  it('does not flag a single successful charge', () => {
    const result = detectCardTesting([attempt('SUCCEEDED', 0)], now);
    expect(result.flagged).toBe(false);
    expect(result.score).toBe(0);
  });

  it('ignores attempts outside the window', () => {
    const attempts = [
      attempt('FAILED', 60),
      attempt('FAILED', 70),
      attempt('FAILED', 80),
    ];
    const result = detectCardTesting(attempts, now, { windowMs: 10 * 60_000 });
    expect(result.flagged).toBe(false);
  });

  it('defaults `now` to the latest attempt when omitted', () => {
    const attempts = [
      attempt('FAILED', 0),
      attempt('FAILED', 1),
      attempt('FAILED', 2),
    ];
    const result = detectCardTesting(attempts);
    expect(result.flagged).toBe(true);
  });
});
