import {
  CompletenessInput,
  computeDataQuality,
  DEFAULT_TARGET_PCT,
} from './data-quality';

function find(report: ReturnType<typeof computeDataQuality>, field: string) {
  return report.fields.find((f) => f.field === field)!;
}

describe('data-quality', () => {
  it('returns 0 for every field when there are no profiles', () => {
    const r = computeDataQuality([]);
    expect(r.overallPct).toBe(0);
    expect(r.fields.every((f) => f.pct === 0 && f.captured === 0)).toBe(true);
    // collectMore is true because 0 < target
    expect(r.fields.every((f) => f.collectMore)).toBe(true);
  });

  it('treats null, undefined and empty string as not captured', () => {
    const profiles: CompletenessInput[] = [
      { gender: 'FEMALE', country: 'Ghana', birthYear: 1998, firstGen: true },
      { gender: null, country: '', birthYear: undefined, firstGen: false },
    ];
    const r = computeDataQuality(profiles);
    expect(find(r, 'gender').captured).toBe(1);
    expect(find(r, 'gender').pct).toBe(50);
    expect(find(r, 'country').captured).toBe(1);
    expect(find(r, 'birthYear').captured).toBe(1);
    // firstGen=false IS captured (false is a real value)
    expect(find(r, 'firstGen').captured).toBe(2);
    expect(find(r, 'firstGen').pct).toBe(100);
  });

  it('flags fields below the target threshold', () => {
    const profiles: CompletenessInput[] = [
      { gender: 'FEMALE', country: 'Ghana' },
      { gender: 'MALE', country: 'Kenya' },
      { gender: null, country: 'Nigeria' },
      { gender: null, country: 'Egypt' },
      { gender: 'FEMALE', country: 'Mali' },
    ];
    const r = computeDataQuality(profiles, DEFAULT_TARGET_PCT);
    // gender 3/5 = 60 < 80 → collectMore
    expect(find(r, 'gender').pct).toBe(60);
    expect(find(r, 'gender').collectMore).toBe(true);
    // country 5/5 = 100 → not collectMore
    expect(find(r, 'country').pct).toBe(100);
    expect(find(r, 'country').collectMore).toBe(false);
  });

  it('respects a custom target threshold', () => {
    const profiles: CompletenessInput[] = [
      { gender: 'FEMALE' },
      { gender: null },
    ];
    // 50% with target 40 → not flagged
    expect(find(computeDataQuality(profiles, 40), 'gender').collectMore).toBe(
      false,
    );
    // 50% with target 60 → flagged
    expect(find(computeDataQuality(profiles, 60), 'gender').collectMore).toBe(
      true,
    );
  });

  it('averages field percentages into an overall score', () => {
    const profiles: CompletenessInput[] = [
      { gender: 'FEMALE', country: 'Ghana', birthYear: 1998, firstGen: true },
    ];
    // all four fields 100% → overall 100
    expect(computeDataQuality(profiles).overallPct).toBe(100);
  });
});
