import {
  employerLabel,
  employerPrefix,
  languageName,
  resolveLocale,
  supportedLocales,
} from './employer-label';

describe('employer-label', () => {
  describe('resolveLocale', () => {
    it('passes through supported locales', () => {
      expect(resolveLocale('de')).toBe('de');
      expect(resolveLocale('fr-FR')).toBe('fr');
    });
    it('falls back to en', () => {
      expect(resolveLocale('zh')).toBe('en');
      expect(resolveLocale(null)).toBe('en');
    });
  });

  describe('languageName / supportedLocales', () => {
    it('names each language', () => {
      expect(languageName('de')).toBe('Deutsch');
      expect(languageName('fr')).toBe('Français');
    });
    it('lists four locales', () => {
      expect(supportedLocales()).toHaveLength(4);
    });
  });

  describe('employerLabel', () => {
    it('renders a name verbatim', () => {
      expect(employerLabel('Société Générale')).toBe('Société Générale');
    });
    it('falls back when empty', () => {
      expect(employerLabel('')).toBe('your employer');
      expect(employerLabel(null)).toBe('your employer');
    });
  });

  describe('employerPrefix', () => {
    it('is locale-aware', () => {
      expect(employerPrefix('en', 'SAP')).toBe('Your employer SAP');
      expect(employerPrefix('de', 'SAP')).toBe('Dein Arbeitgeber SAP');
      expect(employerPrefix('fr', 'SAP')).toBe('Votre employeur SAP');
      expect(employerPrefix('es', 'SAP')).toBe('Tu empresa SAP');
    });
  });
});
