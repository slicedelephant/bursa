import { TrendDelta } from '../../core/models';
import { deltaArrow, deltaClass, deltaSummary, direction, signed } from './trend-format';

describe('trend-format', () => {
  it('classifies direction', () => {
    expect(direction(5)).toBe('up');
    expect(direction(-5)).toBe('down');
    expect(direction(0)).toBe('flat');
  });

  it('maps direction to arrows', () => {
    expect(deltaArrow(1)).toBe('▲');
    expect(deltaArrow(-1)).toBe('▼');
    expect(deltaArrow(0)).toBe('–');
  });

  it('maps direction to colour classes', () => {
    expect(deltaClass(1)).toContain('emerald');
    expect(deltaClass(-1)).toContain('brand-orange');
    expect(deltaClass(0)).toContain('slate2');
  });

  it('signs values', () => {
    expect(signed(45000)).toBe('+45,000');
    expect(signed(-3)).toBe('-3');
    expect(signed(0)).toBe('0');
  });

  it('summarises a delta', () => {
    const delta: TrendDelta = {
      year: 2026,
      investedEurDelta: 45000,
      scholarCountDelta: 27,
      femaleShareDeltaPct: 1.8,
    };
    const s = deltaSummary(delta);
    expect(s).toContain('2026');
    expect(s).toContain('+45,000');
    expect(s).toContain('+27');
    expect(s).toContain('+1.8');
  });
});
