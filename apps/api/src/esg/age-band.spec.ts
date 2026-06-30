import { ageBand, ageBandLabel, AGE_BANDS } from './age-band';

describe('age-band', () => {
  const REF = 2026;

  it('maps ages to bands relative to the reference year', () => {
    expect(ageBand(2005, REF)).toBe('UNDER_25'); // 21
    expect(ageBand(2002, REF)).toBe('UNDER_25'); // 24
    expect(ageBand(2001, REF)).toBe('25_29'); // 25
    expect(ageBand(1997, REF)).toBe('25_29'); // 29
    expect(ageBand(1996, REF)).toBe('30_34'); // 30
    expect(ageBand(1992, REF)).toBe('30_34'); // 34
    expect(ageBand(1991, REF)).toBe('35_PLUS'); // 35
    expect(ageBand(1970, REF)).toBe('35_PLUS');
  });

  it('returns UNKNOWN for null/undefined/invalid input', () => {
    expect(ageBand(null, REF)).toBe('UNKNOWN');
    expect(ageBand(undefined, REF)).toBe('UNKNOWN');
    expect(ageBand(0, REF)).toBe('UNKNOWN');
    expect(ageBand(-5, REF)).toBe('UNKNOWN');
    expect(ageBand(NaN, REF)).toBe('UNKNOWN');
    expect(ageBand(2030, REF)).toBe('UNKNOWN'); // future birth year
  });

  it('defaults the reference year to the current year', () => {
    const thisYear = new Date().getFullYear();
    expect(ageBand(thisYear - 10)).toBe('UNDER_25');
  });

  it('labels every band', () => {
    for (const b of AGE_BANDS) {
      expect(typeof ageBandLabel(b)).toBe('string');
      expect(ageBandLabel(b).length).toBeGreaterThan(0);
    }
    expect(ageBandLabel('35_PLUS')).toBe('35+');
  });
});
