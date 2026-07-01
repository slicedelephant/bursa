/**
 * E19 — Scholarship Program Manager: pure scholar-status state machine.
 *
 * Governs the SRM lifecycle AWARDED -> ENROLLED -> GRADUATED -> WORKING, with
 * WITHDRAWN reachable from any non-terminal state. Invalid transitions throw.
 * `now` is injected for milestone timestamps; no I/O, no mutation.
 */

export type ScholarStatus =
  | 'AWARDED'
  | 'ENROLLED'
  | 'GRADUATED'
  | 'WORKING'
  | 'WITHDRAWN';

export type ScholarEvent = 'enroll' | 'graduate' | 'employ' | 'withdraw';

export interface StatusTransition {
  readonly status: ScholarStatus;
  readonly milestoneField: 'enrolledAt' | 'graduatedAt' | 'employedAt' | 'withdrawnAt';
  readonly at: Date;
}

export class InvalidScholarTransitionError extends Error {
  constructor(current: ScholarStatus, event: ScholarEvent) {
    super(`Cannot apply "${event}" to a scholar in state ${current}`);
    this.name = 'InvalidScholarTransitionError';
  }
}

const TERMINAL: ReadonlySet<ScholarStatus> = new Set(['WITHDRAWN']);

const TRANSITIONS: Record<
  ScholarEvent,
  { from: readonly ScholarStatus[]; to: ScholarStatus; field: StatusTransition['milestoneField'] }
> = {
  enroll: { from: ['AWARDED'], to: 'ENROLLED', field: 'enrolledAt' },
  graduate: { from: ['ENROLLED'], to: 'GRADUATED', field: 'graduatedAt' },
  employ: { from: ['GRADUATED'], to: 'WORKING', field: 'employedAt' },
  withdraw: {
    from: ['AWARDED', 'ENROLLED', 'GRADUATED', 'WORKING'],
    to: 'WITHDRAWN',
    field: 'withdrawnAt',
  },
};

export function isTerminalScholarStatus(status: ScholarStatus): boolean {
  return TERMINAL.has(status);
}

/** Returns the next state + milestone field/timestamp, or throws on an illegal move. */
export function nextScholarStatus(
  current: ScholarStatus,
  event: ScholarEvent,
  now: Date,
): StatusTransition {
  const rule = TRANSITIONS[event];
  if (!rule || !rule.from.includes(current)) {
    throw new InvalidScholarTransitionError(current, event);
  }
  return { status: rule.to, milestoneField: rule.field, at: now };
}
