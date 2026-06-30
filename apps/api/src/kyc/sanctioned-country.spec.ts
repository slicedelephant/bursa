import {
  classifyCountryRisk,
  isElevatedRiskCountry,
  isSanctionedCountry,
  normalizeCountry,
} from './sanctioned-country';

describe('sanctioned-country', () => {
  describe('normalizeCountry', () => {
    it('upper-cases and trims', () => {
      expect(normalizeCountry('  de ')).toBe('DE');
    });
    it('handles null', () => {
      expect(normalizeCountry(null)).toBe('');
    });
  });

  describe('isSanctionedCountry (reused E9 list)', () => {
    it('flags a sanctioned country (case-insensitive)', () => {
      expect(isSanctionedCountry('ru')).toBe(true);
      expect(isSanctionedCountry('IR')).toBe(true);
    });
    it('does not flag a clear country', () => {
      expect(isSanctionedCountry('DE')).toBe(false);
    });
  });

  describe('isElevatedRiskCountry', () => {
    it('flags a grey-list country', () => {
      expect(isElevatedRiskCountry('NG')).toBe(true);
      expect(isElevatedRiskCountry('pk')).toBe(true);
    });
    it('does not flag a clear country', () => {
      expect(isElevatedRiskCountry('DE')).toBe(false);
    });
    it('does not flag a blank country', () => {
      expect(isElevatedRiskCountry('')).toBe(false);
    });
  });

  describe('classifyCountryRisk', () => {
    it('returns SANCTIONED for a sanctioned country', () => {
      expect(classifyCountryRisk('RU')).toBe('SANCTIONED');
    });
    it('returns ELEVATED for a grey-list country', () => {
      expect(classifyCountryRisk('NG')).toBe('ELEVATED');
    });
    it('returns CLEAR for a normal country', () => {
      expect(classifyCountryRisk('DE')).toBe('CLEAR');
    });
    it('returns CLEAR for a blank country', () => {
      expect(classifyCountryRisk(null)).toBe('CLEAR');
    });
  });
});
