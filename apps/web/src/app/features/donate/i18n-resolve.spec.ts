import { isSupportedLocale, label, normalizeLocale } from './i18n-resolve';

describe('i18n-resolve (E20)', () => {
  it('resolves a label from the fetched map', () => {
    expect(label({ amount: 'Kiasi' }, 'amount')).toBe('Kiasi');
  });

  it('falls back to English when the map lacks the key', () => {
    expect(label({}, 'amount')).toBe('Amount');
    expect(label(null, 'to_school')).toBe('Goes to the school');
  });

  it('falls back to the key itself when unknown everywhere', () => {
    expect(label({}, 'unknown_key')).toBe('unknown_key');
  });

  it('ignores blank label values', () => {
    expect(label({ amount: '   ' }, 'amount')).toBe('Amount');
  });

  it('recognizes supported locales', () => {
    expect(isSupportedLocale('sw')).toBe(true);
    expect(isSupportedLocale('de')).toBe(false);
  });

  it('normalizes an unknown or missing locale to en', () => {
    expect(normalizeLocale('SW')).toBe('sw');
    expect(normalizeLocale('de')).toBe('en');
    expect(normalizeLocale(null)).toBe('en');
  });
});
