import { CsrdMetric } from '../../core/models';
import { formatMetricValue, REPORT_STANDARDS, reportStandardLabel, shortHash } from './csrd-format';

const metric = (over: Partial<CsrdMetric> = {}): CsrdMetric => ({
  code: 'GRI 201-1',
  label: 'Economic value',
  value: 125000,
  unit: 'EUR',
  note: 'n',
  ...over,
});

describe('csrd-format', () => {
  it('lists all four standards', () => {
    expect(REPORT_STANDARDS.map((s) => s.value)).toEqual([
      'GRI_2024',
      'CSRD_ESRS',
      'SASB',
      'UN_SDG',
    ]);
  });

  it('labels a standard, falling back to the raw value', () => {
    expect(reportStandardLabel('UN_SDG')).toContain('Sustainable');
    expect(reportStandardLabel('XYZ' as never)).toBe('XYZ');
  });

  it('formats EUR metrics with a thousands separator and 2 decimals', () => {
    expect(formatMetricValue(metric({ value: 125000, unit: 'EUR' }))).toBe('EUR 125,000.00');
  });

  it('formats non-EUR metrics with their unit', () => {
    expect(formatMetricValue(metric({ value: 35.1, unit: '% female' }))).toBe('35.1 % female');
  });

  it('shortens long hashes and leaves short ones intact', () => {
    expect(shortHash('abcdef0123456789')).toBe('abcdef012345…');
    expect(shortHash('abc')).toBe('abc');
  });
});
