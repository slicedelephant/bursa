import { evaluateEligibility, MatchProgram } from './employer-match-lookup';

const program: MatchProgram = {
  domain: 'sap.com',
  employerName: 'SAP',
  matchRatio: 100,
  annualCapCents: 500_000,
  minDonationCents: 1_000,
  integrationLevel: 'PORTAL',
  applyUrlTemplate: 'https://match.sap.com/apply?amount={amount}',
  active: true,
};

describe('evaluateEligibility', () => {
  it('is eligible for an active program meeting the minimum', () => {
    const result = evaluateEligibility(program, 5_000);
    expect(result.eligible).toBe(true);
    expect(result.program).toBe(program);
    expect(result.reason).toBeUndefined();
  });

  it('is eligible exactly at the minimum donation', () => {
    expect(evaluateEligibility(program, 1_000).eligible).toBe(true);
  });

  it('is ineligible with no program', () => {
    const result = evaluateEligibility(null, 5_000);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('NO_PROGRAM');
  });

  it('is ineligible for an inactive program', () => {
    const result = evaluateEligibility({ ...program, active: false }, 5_000);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('INACTIVE');
    expect(result.program).toBeDefined();
  });

  it('is ineligible below the minimum donation', () => {
    const result = evaluateEligibility(program, 500);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('BELOW_MIN_DONATION');
  });
});
