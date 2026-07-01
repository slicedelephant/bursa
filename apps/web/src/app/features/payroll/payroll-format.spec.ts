import { cycleLabel, eur, remainingLabel, usedPercent } from './payroll-format';

describe('eur', () => {
  it('formats cents to whole euros', () => {
    expect(eur(80_000)).toBe('€800');
    expect(eur(null)).toBe('€0');
    expect(eur(undefined)).toBe('€0');
  });
});

describe('cycleLabel', () => {
  it('maps cycles', () => {
    expect(cycleLabel('MONTHLY')).toBe('Monthly');
    expect(cycleLabel('BIWEEKLY')).toBe('Every two weeks');
    expect(cycleLabel('SEMIMONTHLY')).toBe('Twice a month');
    expect(cycleLabel('WEEKLY')).toBe('Weekly');
  });
});

describe('remainingLabel', () => {
  it('shows remaining of cap', () => {
    expect(remainingLabel(40_000, 50_000)).toBe('€400 of €500 match budget left');
  });
});

describe('usedPercent', () => {
  it('computes used percentage', () => {
    expect(usedPercent(40_000, 50_000)).toBe(20);
    expect(usedPercent(0, 50_000)).toBe(100);
    expect(usedPercent(50_000, 50_000)).toBe(0);
  });
  it('returns 0 for a zero cap', () => {
    expect(usedPercent(10_000, 0)).toBe(0);
  });
  it('clamps into [0,100]', () => {
    expect(usedPercent(-10_000, 50_000)).toBe(100);
  });
});
