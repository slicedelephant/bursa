import { DataQualityField } from '../../core/models';
import { barWidth, collectMoreHint, completenessClass, fieldLabel } from './data-quality-format';

const field = (over: Partial<DataQualityField> = {}): DataQualityField => ({
  field: 'gender',
  captured: 4,
  total: 5,
  pct: 80,
  collectMore: false,
  ...over,
});

describe('data-quality-format', () => {
  it('labels known fields and falls back to the raw key', () => {
    expect(fieldLabel('gender')).toBe('Gender');
    expect(fieldLabel('birthYear')).toBe('Age');
    expect(fieldLabel('unknownField')).toBe('unknownField');
  });

  it('colours by completeness band', () => {
    expect(completenessClass(85)).toContain('emerald');
    expect(completenessClass(60)).toContain('amber');
    expect(completenessClass(20)).toContain('brand-orange');
  });

  it('clamps bar width into 0–100%', () => {
    expect(barWidth(50)).toBe('50%');
    expect(barWidth(-10)).toBe('0%');
    expect(barWidth(150)).toBe('100%');
  });

  it('produces a collect-more hint only when flagged', () => {
    expect(collectMoreHint(field({ collectMore: false }))).toBeNull();
    const hint = collectMoreHint(field({ collectMore: true, pct: 15, field: 'birthYear' }));
    expect(hint).toContain('15%');
    expect(hint).toContain('age');
  });
});
