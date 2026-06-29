import {
  duplicateScore,
  isSanctionedCountry,
  matchSuspiciousKeywords,
  normalizeText,
} from './ofac-keyword-matcher';

describe('ofac-keyword-matcher', () => {
  describe('normalizeText', () => {
    it('lower-cases, strips punctuation and collapses whitespace', () => {
      expect(normalizeText('  Hello, WORLD!! ')).toBe('hello world');
    });

    it('returns empty string for nullish input', () => {
      expect(normalizeText(null)).toBe('');
      expect(normalizeText(undefined)).toBe('');
    });
  });

  describe('isSanctionedCountry', () => {
    it('matches case-insensitively and trims', () => {
      expect(isSanctionedCountry('ir')).toBe(true);
      expect(isSanctionedCountry('  KP ')).toBe(true);
    });

    it('returns false for non-sanctioned or missing country', () => {
      expect(isSanctionedCountry('DE')).toBe(false);
      expect(isSanctionedCountry(null)).toBe(false);
      expect(isSanctionedCountry('')).toBe(false);
    });
  });

  describe('matchSuspiciousKeywords', () => {
    it('finds keywords as substrings regardless of punctuation', () => {
      const result = matchSuspiciousKeywords(
        'Guaranteed return! Pay via Western Union now.',
      );
      expect(result.matched).toContain('guaranteed return');
      expect(result.matched).toContain('western union');
      expect(result.count).toBeGreaterThanOrEqual(2);
    });

    it('returns no matches for clean text', () => {
      expect(matchSuspiciousKeywords('Help me fund my MBA tuition')).toEqual({
        matched: [],
        count: 0,
      });
    });

    it('handles empty input', () => {
      expect(matchSuspiciousKeywords('')).toEqual({ matched: [], count: 0 });
    });
  });

  describe('duplicateScore', () => {
    it('is 1 for identical significant tokens', () => {
      expect(duplicateScore('Fund my MBA tuition', 'fund my MBA tuition')).toBe(
        1,
      );
    });

    it('is 0 for disjoint texts', () => {
      expect(duplicateScore('alpha beta', 'gamma delta')).toBe(0);
    });

    it('is between 0 and 1 for partial overlap', () => {
      const score = duplicateScore(
        'help fund engineering scholarship',
        'help fund medical scholarship',
      );
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('is 0 when either side is empty', () => {
      expect(duplicateScore('', 'anything here')).toBe(0);
      expect(duplicateScore('the a an', 'the a an')).toBe(0);
    });
  });
});
