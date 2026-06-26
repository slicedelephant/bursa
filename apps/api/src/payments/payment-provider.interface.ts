/**
 * The single seam between domain logic and any payment processor.
 * The prototype ships MockPaymentProvider; a real provider (Stripe Connect,
 * Mangopay, …) must implement this same interface with zero domain changes.
 */

export type PaymentMethodKind = 'CARD' | 'SEPA';

export interface ChargeInput {
  amountCents: number;
  currency: string;
  method: PaymentMethodKind;
  description?: string;
}

export interface PaymentResult {
  status: 'SUCCEEDED' | 'FAILED';
  reference: string;
  failureReason?: string;
}

export interface PayoutInput {
  amountCents: number;
  currency: string;
  schoolName: string;
  accountRef: string;
  description?: string;
}

export interface PayoutResult {
  status: 'SENT' | 'FAILED';
  reference: string;
  failureReason?: string;
}

export interface PaymentProvider {
  /** Charge a private donor's card. */
  createCardCharge(input: ChargeInput): Promise<PaymentResult>;
  /** Collect a corporate sponsor pledge via SEPA. */
  createSepaPledge(input: ChargeInput): Promise<PaymentResult>;
  /** Disburse funds to a school's verified account. Never to a student. */
  createPayout(input: PayoutInput): Promise<PayoutResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
