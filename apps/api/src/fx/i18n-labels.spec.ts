import { isDonateLocale, labelKeys, resolveLabels } from './i18n-labels';

describe('resolveLabels (E20 i18n)', () => {
  it('recognizes supported locales', () => {
    expect(isDonateLocale('sw')).toBe(true);
    expect(isDonateLocale('de')).toBe(false);
  });

  it('returns Swahili labels for sw', () => {
    const { locale, labels } = resolveLabels('sw');
    expect(locale).toBe('sw');
    expect(labels.amount).toBe('Kiasi');
    expect(labels.to_school).toBe('Huenda shuleni');
  });

  it('falls back to English for an unknown locale', () => {
    const { locale, labels } = resolveLabels('de');
    expect(locale).toBe('en');
    expect(labels.amount).toBe('Amount');
  });

  it('falls back per-key to English when a locale is missing a key', () => {
    // yo has no `you_pay` -> falls back to English
    const { labels } = resolveLabels('yo');
    expect(labels.confirm).toBe('Jẹ́rìí ẹ̀bùn');
    expect(labels.you_pay).toBe('You pay');
  });

  it('resolves only the requested keys', () => {
    const { labels } = resolveLabels('sw', ['amount']);
    expect(Object.keys(labels)).toEqual(['amount']);
  });

  it('exposes the full donate key set', () => {
    expect(labelKeys()).toContain('school_receives');
  });
});
