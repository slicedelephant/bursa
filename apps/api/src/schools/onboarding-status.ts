// Pure self-serve onboarding state machine + readiness predicates (E8).
// No NestJS, no Prisma. The service layer maps invalid transitions to a
// DomainException; this module owns the rules and is fully unit-testable.

import { SchoolOnboardingStatus } from '@prisma/client';

export type OnboardingEvent = 'start' | 'submit' | 'activate';

const TRANSITIONS: Record<
  SchoolOnboardingStatus,
  Partial<Record<OnboardingEvent, SchoolOnboardingStatus>>
> = {
  NOT_STARTED: { start: 'IN_PROGRESS', submit: 'SUBMITTED' },
  IN_PROGRESS: { start: 'IN_PROGRESS', submit: 'SUBMITTED' },
  SUBMITTED: { submit: 'SUBMITTED', activate: 'ACTIVE' },
  ACTIVE: {},
};

/** Whether `event` is allowed from `current`. */
export function canTransition(
  current: SchoolOnboardingStatus,
  event: OnboardingEvent,
): boolean {
  return Boolean(TRANSITIONS[current]?.[event]);
}

/**
 * Returns the next status for an allowed transition, or throws for an invalid
 * one. Invalid transitions are a programmer/flow error and are surfaced loudly.
 */
export function nextOnboardingStatus(
  current: SchoolOnboardingStatus,
  event: OnboardingEvent,
): SchoolOnboardingStatus {
  const next = TRANSITIONS[current]?.[event];
  if (!next) {
    throw new Error(`Invalid onboarding transition: ${current} --(${event})-->`);
  }
  return next;
}

export interface PayoutFields {
  readonly bankAccountName?: string | null;
  readonly iban?: string | null;
  readonly bic?: string | null;
  readonly taxId?: string | null;
  readonly contactName?: string | null;
  readonly contactEmail?: string | null;
}

const filled = (value?: string | null): boolean =>
  typeof value === 'string' && value.trim().length > 0;

/** Payout data is "complete" once the bursar essentials are present (BIC optional). */
export function isPayoutDataComplete(fields: PayoutFields): boolean {
  return (
    filled(fields.bankAccountName) &&
    filled(fields.iban) &&
    filled(fields.taxId) &&
    filled(fields.contactName) &&
    filled(fields.contactEmail)
  );
}

export interface OnboardingState extends PayoutFields {
  readonly onboardingStatus: SchoolOnboardingStatus;
  readonly payoutVerified: boolean;
  readonly agreementSignedAt?: Date | null;
}

export function isOnboarded(state: { onboardingStatus: SchoolOnboardingStatus }): boolean {
  return state.onboardingStatus === 'ACTIVE';
}

/** A school may approve/publish campaigns only when fully active + payout-verified. */
export function canApproveCampaigns(state: {
  onboardingStatus: SchoolOnboardingStatus;
  payoutVerified: boolean;
}): boolean {
  return state.onboardingStatus === 'ACTIVE' && state.payoutVerified;
}

export interface OnboardingStep {
  readonly key: 'payout' | 'agreement' | 'activation';
  readonly label: string;
  readonly done: boolean;
}

export function onboardingChecklist(state: OnboardingState): OnboardingStep[] {
  return [
    { key: 'payout', label: 'Payout & tax details', done: isPayoutDataComplete(state) },
    {
      key: 'agreement',
      label: 'Signed funding agreement',
      done: Boolean(state.agreementSignedAt),
    },
    {
      key: 'activation',
      label: 'Portal activated',
      done: state.onboardingStatus === 'ACTIVE',
    },
  ];
}

export function onboardingProgressPct(state: OnboardingState): number {
  const steps = onboardingChecklist(state);
  const done = steps.filter((step) => step.done).length;
  return Math.round((done / steps.length) * 100);
}
