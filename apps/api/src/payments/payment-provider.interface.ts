/**
 * The single seam between domain logic and any payment processor.
 * The prototype ships MockPaymentProvider; a real provider (Stripe Connect,
 * Mangopay, …) must implement this same interface with zero domain changes.
 *
 * All-or-Nothing model (E2): during a campaign the donor's payment method and
 * SCA are captured up front (`savePledge`) but NO money moves. Funds are only
 * charged once the tuition goal is reached (`captureOnGoalReached`) and then
 * disbursed straight to the school (`payoutToSchool`). If the goal is missed,
 * nothing is ever charged.
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

/** Result of saving a payment method + SCA without charging (SetupIntent concept). */
export interface PledgeResult {
  status: 'AUTHORIZED' | 'FAILED';
  /** Stable reference to the saved payment method / SetupIntent. */
  pledgeRef: string;
  failureReason?: string;
}

/** Off-session charge of a previously saved pledge once the goal is reached. */
export interface CaptureInput {
  pledgeRef: string;
  amountCents: number;
  currency: string;
  description?: string;
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
  /** Charge a private donor's card immediately (legacy / corporate full-tuition path). */
  createCardCharge(input: ChargeInput): Promise<PaymentResult>;
  /** Collect a corporate sponsor pledge via SEPA. */
  createSepaPledge(input: ChargeInput): Promise<PaymentResult>;
  /** Disburse funds to a school's verified account. Never to a student. */
  createPayout(input: PayoutInput): Promise<PayoutResult>;

  /** All-or-Nothing: save the payment method + capture SCA now, charge nothing. */
  savePledge(input: ChargeInput): Promise<PledgeResult>;
  /** All-or-Nothing: charge a saved pledge off_session once the goal is reached. */
  captureOnGoalReached(input: CaptureInput): Promise<PaymentResult>;
  /** Disburse the captured funds directly to the school. */
  payoutToSchool(input: PayoutInput): Promise<PayoutResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
