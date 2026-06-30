import {
  NAME_MATCH_MIN_SCORE,
  levenshtein,
  matchName,
  nameSimilarity,
  normalizeName,
} from './name-match';

describe('name-match', () => {
  describe('normalizeName', () => {
    it('lower-cases, strips punctuation and collapses whitespace', () => {
      expect(normalizeName('  Amara   Okonkwo!  ')).toBe('amara okonkwo');
    });
    it('strips diacritics', () => {
      expect(normalizeName('José Núñez')).toBe('jose nunez');
    });
    it('handles null/undefined', () => {
      expect(normalizeName(null)).toBe('');
      expect(normalizeName(undefined)).toBe('');
    });
  });

  describe('levenshtein', () => {
    it('is 0 for identical strings', () => {
      expect(levenshtein('abc', 'abc')).toBe(0);
    });
    it('equals length when one side is empty', () => {
      expect(levenshtein('', 'abc')).toBe(3);
      expect(levenshtein('abc', '')).toBe(3);
    });
    it('counts a single substitution', () => {
      expect(levenshtein('kitten', 'kitton')).toBe(1);
    });
    it('counts classic kitten/sitting distance', () => {
      expect(levenshtein('kitten', 'sitting')).toBe(3);
    });
  });

  describe('nameSimilarity', () => {
    it('is 100 for identical normalized names', () => {
      expect(nameSimilarity('Amara Okonkwo', 'amara  okonkwo')).toBe(100);
    });
    it('is high for a single typo', () => {
      expect(nameSimilarity('Amara Okonkwo', 'Amara Okonko')).toBeGreaterThan(
        NAME_MATCH_MIN_SCORE,
      );
    });
    it('is low for completely different names', () => {
      expect(nameSimilarity('Amara Okonkwo', 'Kwame Mensah')).toBeLessThan(
        NAME_MATCH_MIN_SCORE,
      );
    });
    it('is 0 when either name is blank', () => {
      expect(nameSimilarity('', 'Amara')).toBe(0);
      expect(nameSimilarity('Amara', '   ')).toBe(0);
    });
  });

  describe('matchName', () => {
    it('matches above the threshold', () => {
      const result = matchName('Amara Okonkwo', 'Amara Okonkwo');
      expect(result.matched).toBe(true);
      expect(result.score).toBe(100);
    });
    it('does not match below the threshold', () => {
      const result = matchName('Amara Okonkwo', 'Bob Smith');
      expect(result.matched).toBe(false);
    });
  });
});
