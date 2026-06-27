import {
  deadlineInfo,
  milestone,
  milestoneLabel,
  percentToGoal,
  remainingCents,
} from './goal-math';

describe('goal-math', () => {
  describe('remainingCents', () => {
    it('returns the gap to the goal', () => {
      expect(remainingCents(2000, 5000)).toBe(3000);
    });
    it('never goes negative when over-funded', () => {
      expect(remainingCents(6000, 5000)).toBe(0);
    });
  });

  describe('percentToGoal', () => {
    it('rounds the percentage', () => {
      expect(percentToGoal(2500, 5000)).toBe(50);
      expect(percentToGoal(1, 3)).toBe(33);
    });
    it('clamps to 0..100', () => {
      expect(percentToGoal(9000, 5000)).toBe(100);
      expect(percentToGoal(100, 0)).toBe(0);
    });
  });

  describe('milestone', () => {
    it('returns null below 80%', () => {
      expect(milestone(79)).toBeNull();
    });
    it('flags the 80% push', () => {
      expect(milestone(80)).toBe('almost-there');
      expect(milestone(89)).toBe('almost-there');
    });
    it('flags the 90% final push', () => {
      expect(milestone(90)).toBe('final-push');
      expect(milestone(99)).toBe('final-push');
    });
    it('flags funded at 100%', () => {
      expect(milestone(100)).toBe('funded');
    });
  });

  describe('milestoneLabel', () => {
    it('labels each milestone and null below 80%', () => {
      expect(milestoneLabel(50)).toBeNull();
      expect(milestoneLabel(80)).toContain('80%');
      expect(milestoneLabel(90)).toContain('90%');
      expect(milestoneLabel(100)).toBe('Goal reached');
    });
  });

  describe('deadlineInfo', () => {
    const now = Date.parse('2026-06-27T12:00:00.000Z');

    it('returns null when no deadline is set', () => {
      expect(deadlineInfo(null, now)).toBeNull();
      expect(deadlineInfo(undefined, now)).toBeNull();
    });
    it('returns null for an unparseable date', () => {
      expect(deadlineInfo('not-a-date', now)).toBeNull();
    });
    it('reports days left and urgency for a near deadline', () => {
      const info = deadlineInfo('2026-06-30T12:00:00.000Z', now);
      expect(info).toEqual({ daysLeft: 3, passed: false, urgent: true });
    });
    it('is not urgent for a far deadline', () => {
      const info = deadlineInfo('2026-08-01T12:00:00.000Z', now);
      expect(info?.urgent).toBe(false);
      expect(info?.passed).toBe(false);
    });
    it('marks a past deadline as passed', () => {
      const info = deadlineInfo('2026-06-20T12:00:00.000Z', now);
      expect(info?.passed).toBe(true);
      expect(info?.urgent).toBe(false);
    });
    it('accepts a Date instance', () => {
      const info = deadlineInfo(new Date('2026-06-29T12:00:00.000Z'), now);
      expect(info?.daysLeft).toBe(2);
    });
  });
});
