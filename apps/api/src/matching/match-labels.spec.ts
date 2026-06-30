import { LabelInput, resolveLabels, resolveLocale } from './match-labels';

const input: LabelInput = {
  employerName: 'SAP',
  matchEur: 100,
  capEur: 5000,
  remainingEur: 800,
};

describe('resolveLocale', () => {
  it('passes through supported locales', () => {
    expect(resolveLocale('de')).toBe('de');
    expect(resolveLocale('fr')).toBe('fr');
    expect(resolveLocale('es')).toBe('es');
    expect(resolveLocale('en')).toBe('en');
  });
  it('takes the first two chars and lowercases', () => {
    expect(resolveLocale('DE-AT')).toBe('de');
  });
  it('falls back to en for unknown/empty', () => {
    expect(resolveLocale('zh')).toBe('en');
    expect(resolveLocale(null)).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });
});

describe('resolveLabels', () => {
  it('builds English labels by default', () => {
    const l = resolveLabels('en', input);
    expect(l.headline).toContain('SAP');
    expect(l.headline).toContain('€100');
    expect(l.cta).toContain('Claim');
    expect(l.balance).toContain('€800');
  });

  it('builds German labels', () => {
    const l = resolveLabels('de', input);
    expect(l.headline).toContain('verdoppelt');
    expect(l.cta).toContain('Arbeitgeber-Match');
    expect(l.balance).toContain('verfügbar');
  });

  it('builds French labels', () => {
    expect(resolveLabels('fr', input).headline).toContain('abonde');
  });

  it('builds Spanish labels', () => {
    expect(resolveLabels('es', input).headline).toContain('iguala');
  });

  it('falls back to English for an unknown locale', () => {
    expect(resolveLabels('xx', input).cta).toContain('Claim');
  });

  it('renders employer names with accents verbatim', () => {
    const l = resolveLabels('fr', {
      ...input,
      employerName: 'Société Générale',
    });
    expect(l.headline).toContain('Société Générale');
  });
});
