/**
 * E19 — Scholarship Program Manager: pure conditional-tranche decision.
 *
 * Decides whether a conditional second tranche is released, based on a GPA
 * threshold. A released tranche is still paid to the SCHOOL (Constitution II);
 * this core only decides RELEASE vs HELD. No I/O; returns a new object.
 */

export type ReleaseOutcome = 'RELEASE' | 'HELD';

export interface ConditionalReleaseInput {
  readonly gpa: number | null;
  readonly threshold: number | null;
  readonly alreadyReleased: boolean;
}

export interface ReleaseDecision {
  readonly decision: ReleaseOutcome;
  readonly reason: string;
}

/** RELEASE only when a threshold is configured, gpa >= threshold, and not yet released. */
export function decideConditionalRelease(
  input: ConditionalReleaseInput,
): ReleaseDecision {
  if (input.alreadyReleased) {
    return { decision: 'HELD', reason: 'ALREADY_RELEASED' };
  }
  if (input.threshold == null) {
    return { decision: 'HELD', reason: 'NO_THRESHOLD_CONFIGURED' };
  }
  if (input.gpa == null) {
    return { decision: 'HELD', reason: 'GPA_NOT_RECORDED' };
  }
  if (input.gpa >= input.threshold) {
    return { decision: 'RELEASE', reason: 'GPA_MET' };
  }
  return { decision: 'HELD', reason: 'GPA_BELOW_THRESHOLD' };
}
