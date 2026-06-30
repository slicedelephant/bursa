import {
  canApproveCampaigns,
  canTransition,
  isOnboarded,
  isPayoutDataComplete,
  nextOnboardingStatus,
  onboardingChecklist,
  onboardingProgressPct,
} from './onboarding-status';

const fullPayout = {
  bankAccountName: 'ESMT Berlin gGmbH',
  iban: 'DE89370400440532013000',
  bic: 'COBADEFFXXX',
  taxId: 'DE123456789',
  contactName: 'Jane Bursar',
  contactEmail: 'bursar@esmt.test',
};

describe('onboarding-status state machine', () => {
  it('allows the documented transitions', () => {
    expect(nextOnboardingStatus('NOT_STARTED', 'start')).toBe('IN_PROGRESS');
    expect(nextOnboardingStatus('IN_PROGRESS', 'submit')).toBe('SUBMITTED');
    expect(nextOnboardingStatus('NOT_STARTED', 'submit')).toBe('SUBMITTED');
    expect(nextOnboardingStatus('SUBMITTED', 'activate')).toBe('ACTIVE');
  });

  it('throws on an invalid transition', () => {
    expect(() => nextOnboardingStatus('ACTIVE', 'submit')).toThrow(
      /Invalid onboarding/,
    );
    expect(() => nextOnboardingStatus('NOT_STARTED', 'activate')).toThrow();
  });

  it('reports whether a transition is allowed', () => {
    expect(canTransition('SUBMITTED', 'activate')).toBe(true);
    expect(canTransition('ACTIVE', 'activate')).toBe(false);
  });
});

describe('onboarding-status predicates', () => {
  it('treats payout data as complete only when essentials are filled (BIC optional)', () => {
    expect(isPayoutDataComplete(fullPayout)).toBe(true);
    expect(isPayoutDataComplete({ ...fullPayout, bic: null })).toBe(true);
    expect(isPayoutDataComplete({ ...fullPayout, iban: '  ' })).toBe(false);
    expect(isPayoutDataComplete({})).toBe(false);
  });

  it('knows when a school is onboarded and may approve campaigns', () => {
    expect(isOnboarded({ onboardingStatus: 'ACTIVE' })).toBe(true);
    expect(isOnboarded({ onboardingStatus: 'SUBMITTED' })).toBe(false);
    expect(
      canApproveCampaigns({ onboardingStatus: 'ACTIVE', payoutVerified: true }),
    ).toBe(true);
    expect(
      canApproveCampaigns({
        onboardingStatus: 'ACTIVE',
        payoutVerified: false,
      }),
    ).toBe(false);
    expect(
      canApproveCampaigns({
        onboardingStatus: 'SUBMITTED',
        payoutVerified: true,
      }),
    ).toBe(false);
  });

  it('builds a checklist and a progress percentage', () => {
    const none = onboardingChecklist({
      onboardingStatus: 'NOT_STARTED',
      payoutVerified: false,
    });
    expect(none.every((step) => !step.done)).toBe(true);
    expect(
      onboardingProgressPct({
        onboardingStatus: 'NOT_STARTED',
        payoutVerified: false,
      }),
    ).toBe(0);

    const full = {
      ...fullPayout,
      onboardingStatus: 'ACTIVE' as const,
      payoutVerified: true,
      agreementSignedAt: new Date(),
    };
    expect(onboardingChecklist(full).every((step) => step.done)).toBe(true);
    expect(onboardingProgressPct(full)).toBe(100);

    const partial = {
      ...fullPayout,
      onboardingStatus: 'IN_PROGRESS' as const,
      payoutVerified: false,
      agreementSignedAt: null,
    };
    expect(onboardingProgressPct(partial)).toBe(33);
  });
});
