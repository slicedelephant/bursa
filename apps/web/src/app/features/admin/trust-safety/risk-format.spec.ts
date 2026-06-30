import { formatEur, formatPct, riskLevelClass, riskLevelLabel, scoreBarWidth } from './risk-format';

describe('risk-format', () => {
  it('formats EUR from cents', () => {
    expect(formatEur(150000)).toBe('€1,500.00');
    expect(formatEur(0)).toBe('€0.00');
  });

  it('formats a percentage to one decimal', () => {
    expect(formatPct(1.49)).toBe('1.5%');
    expect(formatPct(0)).toBe('0%');
  });

  it('title-cases a risk level', () => {
    expect(riskLevelLabel('HIGH')).toBe('High');
    expect(riskLevelLabel('LOW')).toBe('Low');
  });

  it('returns a class per risk level', () => {
    expect(riskLevelClass('CRITICAL')).toContain('brand-orange');
    expect(riskLevelClass('HIGH')).toContain('amber');
    expect(riskLevelClass('MEDIUM')).toContain('amber');
    expect(riskLevelClass('LOW')).toContain('mist');
  });

  it('clamps the score bar width', () => {
    expect(scoreBarWidth(50)).toBe('50%');
    expect(scoreBarWidth(-10)).toBe('0%');
    expect(scoreBarWidth(150)).toBe('100%');
  });

  it('falls back to 0 for nullish numeric input', () => {
    const undef = undefined as unknown as number;
    expect(formatEur(undef)).toBe('€0.00');
    expect(formatPct(undef)).toBe('0%');
    expect(scoreBarWidth(undef)).toBe('0%');
  });
});
