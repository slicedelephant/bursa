import { resolveEligibility } from './employee-eligibility';

const base = {
  salaryBandCents: 5_000_000,
  preTaxEligible: true,
  active: true,
  programActive: true,
};

describe('resolveEligibility', () => {
  it('is eligible when program active, opted in, salary ok', () => {
    const r = resolveEligibility(base);
    expect(r.eligible).toBe(true);
    expect(r.preTaxAllowed).toBe(true);
  });

  it('is ineligible when the program is inactive', () => {
    const r = resolveEligibility({ ...base, programActive: false });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe('PROGRAM_INACTIVE');
  });

  it('is ineligible when not activated (no opt-in)', () => {
    const r = resolveEligibility({ ...base, active: false });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe('NOT_ACTIVATED');
  });

  it('is ineligible below the salary floor', () => {
    const r = resolveEligibility({
      ...base,
      salaryBandCents: 1_000_000,
      minSalaryBandCents: 2_000_000,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe('BELOW_SALARY_FLOOR');
  });

  it('reflects pre-tax eligibility even when ineligible', () => {
    const r = resolveEligibility({
      ...base,
      preTaxEligible: false,
      active: false,
    });
    expect(r.preTaxAllowed).toBe(false);
  });

  it('treats a negative floor as no floor', () => {
    const r = resolveEligibility({
      ...base,
      salaryBandCents: 0,
      minSalaryBandCents: -100,
    });
    expect(r.eligible).toBe(true);
  });
});
