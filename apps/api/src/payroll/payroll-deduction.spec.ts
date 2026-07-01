import { computeDeduction } from './payroll-deduction';

describe('computeDeduction', () => {
  it('is a straight deduction without pre-tax', () => {
    const r = computeDeduction({ contributionCents: 10_000 });
    expect(r.grossCents).toBe(10_000);
    expect(r.netCents).toBe(10_000);
    expect(r.taxSavingCents).toBe(0);
    expect(r.preTax).toBe(false);
  });

  it('applies a pre-tax saving', () => {
    const r = computeDeduction({
      contributionCents: 10_000,
      preTax: true,
      taxRatePercent: 25,
    });
    expect(r.taxSavingCents).toBe(2_500);
    expect(r.netCents).toBe(7_500);
    expect(r.preTax).toBe(true);
  });

  it('floors a fractional saving to whole cents', () => {
    const r = computeDeduction({
      contributionCents: 333,
      preTax: true,
      taxRatePercent: 25,
    });
    // 333 * 25 / 100 = 83.25 → 83
    expect(r.taxSavingCents).toBe(83);
    expect(r.netCents).toBe(250);
  });

  it('treats a negative contribution as 0', () => {
    const r = computeDeduction({ contributionCents: -100 });
    expect(r.grossCents).toBe(0);
    expect(r.netCents).toBe(0);
  });

  it('clamps the tax rate into [0,100]', () => {
    expect(
      computeDeduction({
        contributionCents: 100,
        preTax: true,
        taxRatePercent: 500,
      }).taxSavingCents,
    ).toBe(100);
    expect(
      computeDeduction({
        contributionCents: 100,
        preTax: true,
        taxRatePercent: -5,
      }).taxSavingCents,
    ).toBe(0);
  });

  it('ignores the rate when preTax is off', () => {
    const r = computeDeduction({ contributionCents: 100, taxRatePercent: 50 });
    expect(r.taxSavingCents).toBe(0);
  });
});
