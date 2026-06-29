import {
  countWithinWindow,
  exceedsVelocity,
  HOUR_MS,
} from './velocity-tracker';

describe('velocity-tracker', () => {
  const now = new Date('2026-06-29T12:00:00.000Z');
  const nowMs = now.getTime();

  describe('countWithinWindow', () => {
    it('counts timestamps inside the trailing window', () => {
      const stamps = [
        nowMs - 10 * 60_000, // 10 min ago
        nowMs - 50 * 60_000, // 50 min ago
        nowMs - 2 * HOUR_MS, // 2h ago (outside)
      ];
      expect(countWithinWindow(stamps, now)).toBe(2);
    });

    it('ignores future timestamps', () => {
      expect(countWithinWindow([nowMs + 60_000], now)).toBe(0);
    });

    it('accepts Date and number timestamps and a custom window', () => {
      const stamps = [new Date(nowMs - 30_000), nowMs - 90_000];
      expect(countWithinWindow(stamps, now, 60_000)).toBe(1);
    });

    it('returns 0 for an empty list', () => {
      expect(countWithinWindow([], now)).toBe(0);
    });
  });

  describe('exceedsVelocity', () => {
    it('flags more than 5 events in 1 hour', () => {
      const stamps = Array.from({ length: 6 }, (_, i) => nowMs - i * 60_000);
      const result = exceedsVelocity(stamps, now);
      expect(result.count).toBe(6);
      expect(result.exceeded).toBe(true);
      expect(result.limit).toBe(5);
    });

    it('does not flag exactly the limit', () => {
      const stamps = Array.from({ length: 5 }, (_, i) => nowMs - i * 60_000);
      expect(exceedsVelocity(stamps, now).exceeded).toBe(false);
    });

    it('respects custom limit and window', () => {
      const stamps = [nowMs - 1000, nowMs - 2000, nowMs - 3000];
      const result = exceedsVelocity(stamps, now, {
        limit: 2,
        windowMs: 10_000,
      });
      expect(result.exceeded).toBe(true);
      expect(result.windowMs).toBe(10_000);
    });
  });
});
