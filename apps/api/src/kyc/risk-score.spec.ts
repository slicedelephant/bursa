import { RiskLevel } from '@prisma/client';
import { clampScore, scoreStudentRisk, scoreToLevel } from './risk-score';

describe('risk-score', () => {
  describe('clampScore', () => {
    it('clamps and rounds', () => {
      expect(clampScore(-5)).toBe(0);
      expect(clampScore(150)).toBe(100);
      expect(clampScore(49.6)).toBe(50);
    });
    it('treats NaN as 0', () => {
      expect(clampScore(NaN)).toBe(0);
    });
  });

  describe('scoreToLevel', () => {
    it('maps bands', () => {
      expect(scoreToLevel(0)).toBe(RiskLevel.LOW);
      expect(scoreToLevel(25)).toBe(RiskLevel.MEDIUM);
      expect(scoreToLevel(50)).toBe(RiskLevel.HIGH);
      expect(scoreToLevel(75)).toBe(RiskLevel.CRITICAL);
    });
  });

  describe('scoreStudentRisk', () => {
    it('is LOW/0 for a clean profile', () => {
      const result = scoreStudentRisk({
        country: 'PT',
        incomeVerified: true,
        schoolAccredited: true,
      });
      expect(result.score).toBe(0);
      expect(result.level).toBe(RiskLevel.LOW);
      expect(result.reasons).toEqual([]);
    });

    it('adds geographic risk for an elevated country', () => {
      const result = scoreStudentRisk({ country: 'NG' });
      expect(result.score).toBe(30);
      expect(result.reasons.join(' ')).toMatch(/Elevated-risk country/);
    });

    it('adds risk for unverified income and unaccredited school', () => {
      const result = scoreStudentRisk({
        country: 'DE',
        incomeVerified: false,
        schoolAccredited: false,
      });
      expect(result.score).toBe(45);
      expect(result.level).toBe(RiskLevel.MEDIUM);
    });

    it('drives a sanctioned country into the CRITICAL band', () => {
      const result = scoreStudentRisk({
        country: 'RU',
        incomeVerified: false,
        schoolAccredited: false,
      });
      expect(result.score).toBe(100);
      expect(result.level).toBe(RiskLevel.CRITICAL);
    });
  });
});
