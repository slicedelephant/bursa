import { HIGH_VALUE_CENTS, scoreDonorRisk } from './donor-risk';

describe('donor-risk', () => {
  it('scores a clean low-value domestic donation as LOW with no flags', () => {
    const result = scoreDonorRisk({ country: 'DE', amountCents: 5_000 });
    expect(result.score).toBe(0);
    expect(result.level).toBe('LOW');
    expect(result.autoFlagged).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it('auto-flags high-value donations (>= 5k EUR)', () => {
    const result = scoreDonorRisk({
      country: 'DE',
      amountCents: HIGH_VALUE_CENTS,
    });
    expect(result.reasons).toContain('high_value');
    expect(result.autoFlagged).toBe(true);
  });

  it('adds risk for sanctioned geography', () => {
    const result = scoreDonorRisk({ country: 'ir', amountCents: 1_000 });
    expect(result.reasons.some((r) => r.startsWith('sanctioned_geography'))).toBe(
      true,
    );
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it('adds risk for high velocity', () => {
    const result = scoreDonorRisk({
      country: 'DE',
      amountCents: 1_000,
      recentDonationCount: 7,
    });
    expect(result.reasons).toContain('transaction_velocity:7');
  });

  it('adds risk for prepaid cards and recent failures', () => {
    const result = scoreDonorRisk({
      country: 'DE',
      amountCents: 1_000,
      cardType: 'prepaid',
      failedRecentCount: 3,
    });
    expect(result.reasons).toContain('prepaid_card');
    expect(result.reasons).toContain('recent_failures:3');
  });

  it('stacks signals into a CRITICAL, auto-flagged result', () => {
    const result = scoreDonorRisk({
      country: 'RU',
      amountCents: HIGH_VALUE_CENTS,
      recentDonationCount: 9,
      cardType: 'PREPAID',
      failedRecentCount: 4,
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe('CRITICAL');
    expect(result.autoFlagged).toBe(true);
  });
});
