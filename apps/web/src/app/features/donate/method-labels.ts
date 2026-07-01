import { LocalPaymentMethod } from '../../core/models';

/**
 * E20 — pure presentation helpers for local payment methods. No I/O; returns new values,
 * never mutates inputs. These methods are donor-deposit only; money still goes to the
 * school.
 */

export function methodLabel(method: LocalPaymentMethod): string {
  switch (method) {
    case 'CARD':
      return 'Card';
    case 'SEPA':
      return 'SEPA transfer';
    case 'MPESA':
      return 'M-Pesa';
    case 'MOBILE_MONEY':
      return 'Mobile Money';
    case 'GCASH':
      return 'GCash';
    case 'BKASH':
      return 'bKash';
    case 'LOCAL_BANK_TRANSFER':
      return 'Local bank transfer';
    default:
      return method;
  }
}

/** Tailwind badge classes for a method (local methods green, card/SEPA neutral). */
export function methodBadge(method: LocalPaymentMethod): string {
  switch (method) {
    case 'CARD':
    case 'SEPA':
      return 'bg-slate2/10 text-slate2';
    default:
      return 'bg-brand-green/10 text-brand-green';
  }
}

/** True when a method is a local (non-card/SEPA) rail. */
export function isLocalMethod(method: LocalPaymentMethod): boolean {
  return method !== 'CARD' && method !== 'SEPA';
}
