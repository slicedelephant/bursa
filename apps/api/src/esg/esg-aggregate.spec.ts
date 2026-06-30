import { buildEsgAggregate, EsgAggregateInput } from './esg-aggregate';

const REF = 2026;

function input(over: Partial<EsgAggregateInput> = {}): EsgAggregateInput {
  return {
    entries: [],
    profiles: [],
    tags: [],
    refYear: REF,
    ...over,
  };
}

describe('esg-aggregate', () => {
  it('splits invested vs donated by entry type', () => {
    const agg = buildEsgAggregate(
      input({
        entries: [
          {
            entryType: 'DONATION',
            amountCents: 10_000,
            createdAt: '2026-01-01',
          },
          {
            entryType: 'DONATION',
            amountCents: 5_000,
            createdAt: '2026-02-01',
          },
          { entryType: 'PAYOUT', amountCents: 12_000, createdAt: '2026-03-01' },
          {
            entryType: 'DISBURSEMENT',
            amountCents: 3_000,
            createdAt: '2026-04-01',
          },
        ],
      }),
    );
    expect(agg.donatedCents).toBe(15_000);
    expect(agg.donationCount).toBe(2);
    // invested = payout + disbursement
    expect(agg.investedCents).toBe(15_000);
    expect(agg.payoutCount).toBe(1);
    expect(agg.disbursementCount).toBe(1);
  });

  it('folds diversity profiles into the aggregate', () => {
    const agg = buildEsgAggregate(
      input({
        profiles: [
          {
            gender: 'FEMALE',
            country: 'Ghana',
            birthYear: 1998,
            firstGen: true,
          },
          {
            gender: 'MALE',
            country: 'Kenya',
            birthYear: 1995,
            firstGen: false,
          },
        ],
      }),
    );
    expect(agg.diversity.scholarCount).toBe(2);
    expect(agg.diversity.femaleSharePct).toBe(50);
    expect(agg.diversity.countriesReached).toBe(2);
  });

  it('folds ESG tag categories into a zero-filled distribution', () => {
    const agg = buildEsgAggregate(
      input({
        tags: [
          { category: 'QUALITY_EDUCATION' },
          { category: 'QUALITY_EDUCATION' },
          { category: 'GENDER_EQUALITY' },
        ],
      }),
    );
    expect(agg.taggedCount).toBe(3);
    expect(agg.categoryCounts.QUALITY_EDUCATION).toBe(2);
    expect(agg.categoryCounts.GENDER_EQUALITY).toBe(1);
    expect(agg.categoryCounts.GEOGRAPHIC_REACH).toBe(0);
  });

  it('returns zeros for an empty input', () => {
    const agg = buildEsgAggregate(input());
    expect(agg.investedCents).toBe(0);
    expect(agg.donatedCents).toBe(0);
    expect(agg.diversity.scholarCount).toBe(0);
    expect(agg.taggedCount).toBe(0);
  });
});
