import {
  categoryDistribution,
  ESG_CATEGORIES,
  esgCategoryLabel,
  isEsgCategory,
  parseEsgCategory,
} from './esg-category';

describe('esg-category', () => {
  describe('isEsgCategory', () => {
    it('accepts every defined category', () => {
      for (const c of ESG_CATEGORIES) {
        expect(isEsgCategory(c)).toBe(true);
      }
    });

    it('rejects unknown strings and non-strings', () => {
      expect(isEsgCategory('CLIMATE')).toBe(false);
      expect(isEsgCategory('')).toBe(false);
      expect(isEsgCategory(null)).toBe(false);
      expect(isEsgCategory(42)).toBe(false);
      expect(isEsgCategory(undefined)).toBe(false);
    });
  });

  describe('parseEsgCategory', () => {
    it('returns the typed value for a valid category', () => {
      expect(parseEsgCategory('GENDER_EQUALITY')).toBe('GENDER_EQUALITY');
    });

    it('throws for an invalid category', () => {
      expect(() => parseEsgCategory('NOPE')).toThrow('valid EsgCategory');
    });
  });

  describe('esgCategoryLabel', () => {
    it('returns a human-readable label', () => {
      expect(esgCategoryLabel('QUALITY_EDUCATION')).toBe('Quality Education');
      expect(esgCategoryLabel('GEOGRAPHIC_REACH')).toBe('Geographic Reach');
    });
  });

  describe('categoryDistribution', () => {
    it('zero-fills every category', () => {
      const dist = categoryDistribution([]);
      expect(Object.keys(dist).sort()).toEqual([...ESG_CATEGORIES].sort());
      expect(Object.values(dist).every((n) => n === 0)).toBe(true);
    });

    it('counts tagged entries per category', () => {
      const dist = categoryDistribution([
        { category: 'QUALITY_EDUCATION' },
        { category: 'QUALITY_EDUCATION' },
        { category: 'GENDER_EQUALITY' },
      ]);
      expect(dist.QUALITY_EDUCATION).toBe(2);
      expect(dist.GENDER_EQUALITY).toBe(1);
      expect(dist.GEOGRAPHIC_REACH).toBe(0);
    });

    it('does not mutate its input', () => {
      const input = [{ category: 'ECONOMIC_GROWTH' as const }];
      const copy = [...input];
      categoryDistribution(input);
      expect(input).toEqual(copy);
    });
  });
});
