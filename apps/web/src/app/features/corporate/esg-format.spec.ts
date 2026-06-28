import { EsgMetrics } from '../../core/models';
import { documentTypeLabel, esgTiles, invoiceStatusLabel } from './esg-format';

const metrics: EsgMetrics = {
  studentsSupported: 3,
  countriesReached: 2,
  schoolsSupported: 2,
  totalCommittedCents: 4_200_000,
  fullScholarships: 1,
  namedScholarships: 1,
};

describe('esgTiles', () => {
  it('returns six tiles with the money flag on the total', () => {
    const tiles = esgTiles(metrics);
    expect(tiles).toHaveLength(6);
    expect(tiles.map((t) => t.value)).toEqual([3, 2, 2, 4_200_000, 1, 1]);
    expect(tiles.find((t) => t.key === 'totalCommittedCents')?.money).toBe(true);
    expect(tiles.find((t) => t.key === 'studentsSupported')?.money).toBeUndefined();
  });
});

describe('documentTypeLabel', () => {
  it('distinguishes sponsoring from donation', () => {
    expect(documentTypeLabel('SPONSORING')).toContain('19% VAT');
    expect(documentTypeLabel('DONATION')).toContain('no VAT');
  });
});

describe('invoiceStatusLabel', () => {
  it('labels each status', () => {
    expect(invoiceStatusLabel('PAID')).toBe('Paid');
    expect(invoiceStatusLabel('PENDING')).toContain('SEPA');
    expect(invoiceStatusLabel('ISSUED')).toBe('Issued');
  });
});
