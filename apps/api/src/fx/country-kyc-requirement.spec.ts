import {
  requiresEnhancedReview,
  resolveKycRequirement,
} from './country-kyc-requirement';

describe('resolveKycRequirement (E20)', () => {
  it('requires BVN in Nigeria', () => {
    const r = resolveKycRequirement('NG');
    expect(r.document).toBe('BVN');
    expect(r.amlThresholdMinor).toBe(50000);
  });

  it('requires a national ID in Kenya', () => {
    expect(resolveKycRequirement('KE').document).toBe('NATIONAL_ID');
  });

  it('normalizes the country code', () => {
    expect(resolveKycRequirement('ng').document).toBe('BVN');
  });

  it('defaults to passport for an unknown country', () => {
    const r = resolveKycRequirement('ZZ');
    expect(r.document).toBe('PASSPORT');
    expect(r.amlThresholdMinor).toBe(100000);
  });
});

describe('requiresEnhancedReview (E20)', () => {
  it('flags amounts at or above the country threshold', () => {
    expect(requiresEnhancedReview('NG', 50000)).toBe(true);
    expect(requiresEnhancedReview('NG', 60000)).toBe(true);
  });

  it('does not flag amounts below the threshold', () => {
    expect(requiresEnhancedReview('NG', 49999)).toBe(false);
  });
});
