import {
  checklistProgressPct,
  isOnboardingComplete,
  onboardingStageIndex,
  onboardingStatusClass,
  onboardingStatusLabel,
} from './onboarding-progress';

describe('onboarding-progress', () => {
  it('labels each status', () => {
    expect(onboardingStatusLabel('NOT_STARTED')).toBe('Not started');
    expect(onboardingStatusLabel('IN_PROGRESS')).toBe('In progress');
    expect(onboardingStatusLabel('SUBMITTED')).toBe('Submitted');
    expect(onboardingStatusLabel('ACTIVE')).toBe('Active');
    expect(onboardingStatusLabel('WAT' as never)).toBe('Unknown');
  });

  it('maps each status to a chip class', () => {
    expect(onboardingStatusClass('ACTIVE')).toContain('brand-green');
    expect(onboardingStatusClass('SUBMITTED')).toContain('brand-blue');
    expect(onboardingStatusClass('IN_PROGRESS')).toContain('amber');
    expect(onboardingStatusClass('NOT_STARTED')).toContain('slate');
  });

  it('returns the stage index', () => {
    expect(onboardingStageIndex('NOT_STARTED')).toBe(0);
    expect(onboardingStageIndex('ACTIVE')).toBe(3);
    expect(onboardingStageIndex('NOPE' as never)).toBe(0);
  });

  it('computes checklist progress', () => {
    expect(checklistProgressPct([])).toBe(0);
    expect(
      checklistProgressPct([
        { key: 'a', label: 'A', done: true },
        { key: 'b', label: 'B', done: false },
        { key: 'c', label: 'C', done: false },
      ]),
    ).toBe(33);
    expect(checklistProgressPct([{ key: 'a', label: 'A', done: true }])).toBe(100);
  });

  it('knows when onboarding is complete', () => {
    expect(isOnboardingComplete('ACTIVE')).toBe(true);
    expect(isOnboardingComplete('SUBMITTED')).toBe(false);
  });
});
