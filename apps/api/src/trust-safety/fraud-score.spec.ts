import {
  aggregateFraudScore,
  clampScore,
  scoreToLevel,
} from './fraud-score';

describe('fraud-score', () => {
  describe('clampScore', () => {
    it('clamps below 0 and above 100', () => {
      expect(clampScore(-10)).toBe(0);
      expect(clampScore(150)).toBe(100);
    });

    it('rounds and passes through in-range values', () => {
      expect(clampScore(42.4)).toBe(42);
      expect(clampScore(42.6)).toBe(43);
    });

    it('treats non-finite input as 0', () => {
      expect(clampScore(NaN)).toBe(0);
      expect(clampScore(Infinity)).toBe(0);
    });
  });

  describe('scoreToLevel', () => {
    it('maps each band', () => {
      expect(scoreToLevel(0)).toBe('LOW');
      expect(scoreToLevel(24)).toBe('LOW');
      expect(scoreToLevel(25)).toBe('MEDIUM');
      expect(scoreToLevel(49)).toBe('MEDIUM');
      expect(scoreToLevel(50)).toBe('HIGH');
      expect(scoreToLevel(74)).toBe('HIGH');
      expect(scoreToLevel(75)).toBe('CRITICAL');
      expect(scoreToLevel(200)).toBe('CRITICAL');
    });
  });

  describe('aggregateFraudScore', () => {
    it('sums component scores and clamps to 100', () => {
      const result = aggregateFraudScore([
        { score: 60, reasons: ['a'] },
        { score: 60, reasons: ['b'] },
      ]);
      expect(result.score).toBe(100);
      expect(result.level).toBe('CRITICAL');
    });

    it('merges reasons without duplicates, preserving order', () => {
      const result = aggregateFraudScore([
        { score: 10, reasons: ['x', 'y'] },
        { score: 5, reasons: ['y', 'z'] },
      ]);
      expect(result.reasons).toEqual(['x', 'y', 'z']);
      expect(result.score).toBe(15);
      expect(result.level).toBe('LOW');
    });

    it('handles an empty component list', () => {
      const result = aggregateFraudScore([]);
      expect(result).toEqual({ score: 0, level: 'LOW', reasons: [] });
    });

    it('tolerates missing/zero scores', () => {
      const result = aggregateFraudScore([
        { score: 0, reasons: [] },
        { score: 30, reasons: ['r'] },
      ]);
      expect(result.score).toBe(30);
      expect(result.level).toBe('MEDIUM');
    });
  });
});
