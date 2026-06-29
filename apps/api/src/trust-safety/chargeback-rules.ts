/**
 * E9 Trust-and-Safety — pure chargeback/dispute rules.
 *
 * Decides whether a low-value dispute is eligible for an auto-refund offer and
 * owns the chargeback status transitions. An auto-refund offer is only a
 * decision/status here — no real money moves (Constitution III). Pure, no I/O.
 */

export type ChargebackStatusValue =
  | 'OPEN'
  | 'EVIDENCE_SUBMITTED'
  | 'REFUND_OFFERED'
  | 'WON'
  | 'LOST';

/** Disputes at/below this amount (in cents) are eligible for an auto-refund: 50 EUR. */
export const AUTO_REFUND_MAX_CENTS = 5_000;

/** True when a dispute is small enough to simply offer a refund. */
export function shouldOfferAutoRefund(
  amountCents: number,
  maxCents: number = AUTO_REFUND_MAX_CENTS,
): boolean {
  return amountCents > 0 && amountCents <= maxCents;
}

/** Evidence can only be submitted while the dispute is still OPEN. */
export function canSubmitEvidence(status: ChargebackStatusValue): boolean {
  return status === 'OPEN';
}

/** A refund can only be offered for an OPEN, low-value dispute. */
export function canOfferRefund(
  status: ChargebackStatusValue,
  amountCents: number,
  maxCents: number = AUTO_REFUND_MAX_CENTS,
): boolean {
  return status === 'OPEN' && shouldOfferAutoRefund(amountCents, maxCents);
}

export type ChargebackTransition =
  | 'SUBMIT_EVIDENCE'
  | 'OFFER_REFUND'
  | 'WIN'
  | 'LOSE';

const NEXT: Record<ChargebackTransition, ChargebackStatusValue> = {
  SUBMIT_EVIDENCE: 'EVIDENCE_SUBMITTED',
  OFFER_REFUND: 'REFUND_OFFERED',
  WIN: 'WON',
  LOSE: 'LOST',
};

/**
 * Resolves the next chargeback status for a transition. SUBMIT_EVIDENCE and
 * OFFER_REFUND require an OPEN dispute; WIN/LOSE may follow OPEN or
 * EVIDENCE_SUBMITTED. Invalid transitions throw `INVALID_TRANSITION`.
 */
export function nextChargebackStatus(
  current: ChargebackStatusValue,
  transition: ChargebackTransition,
): ChargebackStatusValue {
  const isOpen = current === 'OPEN';
  const isPending = current === 'OPEN' || current === 'EVIDENCE_SUBMITTED';

  if (transition === 'SUBMIT_EVIDENCE' && !isOpen) {
    throw new Error('INVALID_TRANSITION');
  }
  if (transition === 'OFFER_REFUND' && !isOpen) {
    throw new Error('INVALID_TRANSITION');
  }
  if ((transition === 'WIN' || transition === 'LOSE') && !isPending) {
    throw new Error('INVALID_TRANSITION');
  }
  return NEXT[transition];
}
