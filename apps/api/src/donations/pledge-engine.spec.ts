import {
  isGoalReached,
  pledgeOutcome,
  remainingCents,
  summarizeCapture,
} from './pledge-engine';

describe('pledge-engine', () => {
  describe('isGoalReached', () => {
    it('is false below the goal', () => {
      expect(isGoalReached(4000, 5000)).toBe(false);
    });
    it('is true at or above the goal', () => {
      expect(isGoalReached(5000, 5000)).toBe(true);
      expect(isGoalReached(6000, 5000)).toBe(true);
    });
    it('is false for a zero goal (guards divide-by-zero campaigns)', () => {
      expect(isGoalReached(100, 0)).toBe(false);
    });
  });

  describe('remainingCents', () => {
    it('returns the gap to the goal', () => {
      expect(remainingCents(2000, 5000)).toBe(3000);
    });
    it('never goes negative when over-funded', () => {
      expect(remainingCents(7000, 5000)).toBe(0);
    });
  });

  describe('pledgeOutcome', () => {
    it('stays PLEDGED while below the goal', () => {
      expect(pledgeOutcome(4000, 5000)).toBe('PLEDGED');
    });
    it('becomes CAPTURED once the goal is reached', () => {
      expect(pledgeOutcome(5000, 5000)).toBe('CAPTURED');
    });
  });

  describe('summarizeCapture', () => {
    const pledges = [
      { id: 'a', amountCents: 1000, pledgeRef: 'r1' },
      { id: 'b', amountCents: 2000, pledgeRef: 'r2' },
      { id: 'c', amountCents: 3000, pledgeRef: 'r3' },
    ];

    it('captures all when every charge succeeds', () => {
      const s = summarizeCapture(pledges, (p) => `ref_${p.id}`);
      expect(s.capturedIds).toEqual(['a', 'b', 'c']);
      expect(s.failedIds).toEqual([]);
      expect(s.capturedCents).toBe(6000);
    });

    it('separates failures and only counts captured cents', () => {
      const s = summarizeCapture(pledges, (p) =>
        p.id === 'b' ? null : `ref_${p.id}`,
      );
      expect(s.capturedIds).toEqual(['a', 'c']);
      expect(s.failedIds).toEqual(['b']);
      expect(s.capturedCents).toBe(4000);
    });

    it('does not mutate the input array', () => {
      const copy = [...pledges];
      summarizeCapture(pledges, () => null);
      expect(pledges).toEqual(copy);
    });
  });
});
