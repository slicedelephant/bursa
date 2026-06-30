import { TransparencyView } from '../../core/models';
import { formatEur, geographyBars, paidOutPercent, statTiles } from './transparency-format';

const data: TransparencyView = {
  schoolId: 'school-1',
  schoolName: 'ESMT Berlin',
  totalRaisedCents: 100000,
  totalPaidOutCents: 60000,
  donationCount: 8,
  avgDonationCents: 12500,
  studentsSupported: 3,
  donorGeography: [
    { country: 'DE', donationCount: 5, amountCents: 60000 },
    { country: 'US', donationCount: 3, amountCents: 40000 },
  ],
};

describe('transparency-format', () => {
  describe('formatEur', () => {
    it('formats cents as euros', () => {
      expect(formatEur(100000)).toContain('1,000');
    });
  });

  describe('statTiles', () => {
    it('builds four headline tiles', () => {
      const tiles = statTiles(data);
      expect(tiles).toHaveLength(4);
      expect(tiles[0].label).toBe('Total raised');
      expect(tiles[2].value).toBe('3');
    });
  });

  describe('paidOutPercent', () => {
    it('computes the paid-out share', () => {
      expect(paidOutPercent(data)).toBe(60);
    });
    it('is 0 when nothing raised', () => {
      expect(paidOutPercent({ ...data, totalRaisedCents: 0 })).toBe(0);
    });
    it('caps at 100', () => {
      expect(
        paidOutPercent({
          ...data,
          totalRaisedCents: 100,
          totalPaidOutCents: 200,
        }),
      ).toBe(100);
    });
  });

  describe('geographyBars', () => {
    it('scales bars against the largest amount', () => {
      const bars = geographyBars(data.donorGeography);
      expect(bars[0].widthPercent).toBe('100%');
      expect(bars[1].widthPercent).toBe('67%');
      expect(bars[0].amountLabel).toContain('600');
    });
    it('returns 0% bars when all amounts are zero', () => {
      const bars = geographyBars([{ country: 'DE', donationCount: 0, amountCents: 0 }]);
      expect(bars[0].widthPercent).toBe('0%');
    });
  });
});
