// Pure presentation helpers for the chargeback queue. No Angular, no I/O.

import { ChargebackStatus } from '../../../core/models';

/** Disputes at/below this amount (cents) are eligible for an auto-refund: 50 EUR. */
export const AUTO_REFUND_MAX_CENTS = 5_000;

/** Human label for a chargeback status. */
export function chargebackStatusLabel(status: ChargebackStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'EVIDENCE_SUBMITTED':
      return 'Evidence submitted';
    case 'REFUND_OFFERED':
      return 'Refund offered';
    case 'WON':
      return 'Won';
    case 'LOST':
      return 'Lost';
    default:
      return status;
  }
}

/** Tailwind chip classes for a chargeback status. */
export function chargebackStatusClass(status: ChargebackStatus): string {
  switch (status) {
    case 'WON':
      return 'bg-brand-green/10 text-brand-green ring-brand-green/30';
    case 'LOST':
      return 'bg-brand-orange/10 text-brand-orange ring-brand-orange/30';
    case 'REFUND_OFFERED':
      return 'bg-brand-blue/10 text-brand-blue ring-brand-blue/30';
    case 'EVIDENCE_SUBMITTED':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    default:
      return 'bg-mist text-slate2 ring-black/10';
  }
}

/** True when an open, low-value dispute may be offered an auto-refund. */
export function refundEligible(status: ChargebackStatus, amountCents: number): boolean {
  return status === 'OPEN' && amountCents > 0 && amountCents <= AUTO_REFUND_MAX_CENTS;
}
