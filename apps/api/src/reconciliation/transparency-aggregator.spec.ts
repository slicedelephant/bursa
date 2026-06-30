import {
  aggregateTransparency,
  TransparencyDonationInput,
} from './transparency-aggregator';

const donations: TransparencyDonationInput[] = [
  { amountCents: 10000, donorCountry: 'DE', campaignId: 'c1' },
  { amountCents: 20000, donorCountry: 'US', campaignId: 'c1' },
  { amountCents: 5000, donorCountry: 'DE', campaignId: 'c2' },
  { amountCents: 5000, donorCountry: null, campaignId: 'c2' },
];

describe('transparency-aggregator', () => {
  it('computes totals, average and students supported', () => {
    const agg = aggregateTransparency(donations, [{ amountCents: 30000 }]);
    expect(agg.totalRaisedCents).toBe(40000);
    expect(agg.totalPaidOutCents).toBe(30000);
    expect(agg.donationCount).toBe(4);
    expect(agg.avgDonationCents).toBe(10000);
    expect(agg.studentsSupported).toBe(2);
  });

  it('aggregates donor geography sorted by amount desc', () => {
    const agg = aggregateTransparency(donations, []);
    expect(agg.donorGeography[0].country).toBe('US');
    expect(agg.donorGeography[0].amountCents).toBe(20000);
    const de = agg.donorGeography.find((g) => g.country === 'DE');
    expect(de?.donationCount).toBe(2);
    expect(de?.amountCents).toBe(15000);
  });

  it('buckets a missing country as Unknown', () => {
    const agg = aggregateTransparency(donations, []);
    expect(agg.donorGeography.some((g) => g.country === 'Unknown')).toBe(true);
  });

  it('handles an empty school (no donations, no payouts)', () => {
    const agg = aggregateTransparency([], []);
    expect(agg.totalRaisedCents).toBe(0);
    expect(agg.avgDonationCents).toBe(0);
    expect(agg.studentsSupported).toBe(0);
    expect(agg.donorGeography).toHaveLength(0);
  });
});
