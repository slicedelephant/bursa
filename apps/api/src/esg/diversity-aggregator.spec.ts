import {
  aggregateDiversity,
  DiversityProfileInput,
} from './diversity-aggregator';

const REF = 2026;

function p(over: Partial<DiversityProfileInput> = {}): DiversityProfileInput {
  return {
    gender: null,
    birthYear: null,
    country: null,
    firstGen: null,
    ...over,
  };
}

describe('diversity-aggregator', () => {
  it('counts scholars and zero-fills an empty set', () => {
    const agg = aggregateDiversity([], REF);
    expect(agg.scholarCount).toBe(0);
    expect(agg.femaleSharePct).toBe(0);
    expect(agg.firstGenSharePct).toBe(0);
    expect(agg.countriesReached).toBe(0);
    expect(agg.genderCounts.FEMALE).toBe(0);
    expect(agg.ageBandCounts.UNKNOWN).toBe(0);
  });

  it('computes female share only over captured genders', () => {
    const agg = aggregateDiversity(
      [
        p({ gender: 'FEMALE' }),
        p({ gender: 'MALE' }),
        p({ gender: 'FEMALE' }),
        p({ gender: null }), // not captured → excluded from denominator
      ],
      REF,
    );
    expect(agg.genderCounts.FEMALE).toBe(2);
    expect(agg.genderCounts.MALE).toBe(1);
    // 2 of 3 captured
    expect(agg.femaleSharePct).toBe(66.7);
  });

  it('counts countries and distinct countries reached', () => {
    const agg = aggregateDiversity(
      [
        p({ country: 'Nigeria' }),
        p({ country: 'Nigeria' }),
        p({ country: 'Kenya' }),
      ],
      REF,
    );
    expect(agg.countryCounts.Nigeria).toBe(2);
    expect(agg.countryCounts.Kenya).toBe(1);
    expect(agg.countriesReached).toBe(2);
  });

  it('buckets ages into bands and counts unknowns', () => {
    const agg = aggregateDiversity(
      [p({ birthYear: 2003 }), p({ birthYear: 1995 }), p({ birthYear: null })],
      REF,
    );
    expect(agg.ageBandCounts.UNDER_25).toBe(1); // 23
    expect(agg.ageBandCounts['30_34']).toBe(1); // 31
    expect(agg.ageBandCounts.UNKNOWN).toBe(1);
  });

  it('computes first-gen share only over captured values', () => {
    const agg = aggregateDiversity(
      [p({ firstGen: true }), p({ firstGen: false }), p({ firstGen: null })],
      REF,
    );
    expect(agg.firstGenSharePct).toBe(50);
  });

  it('does not mutate its input', () => {
    const input = [p({ gender: 'FEMALE', country: 'Ghana' })];
    const snapshot = JSON.stringify(input);
    aggregateDiversity(input, REF);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
