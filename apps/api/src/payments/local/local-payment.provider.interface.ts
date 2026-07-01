/**
 * E20 — the single seam between the local donor-DEPOSIT flow and any local payment
 * gateway (M-Pesa, mobile money, GCash, bKash, local bank transfer). The prototype ships
 * `MockLocalDepositProvider`; a real adapter must implement this same interface with zero
 * domain changes — exactly the `PaymentProvider` line (E2). No real gateway call is made
 * anywhere in the prototype.
 *
 * A deposit is ALWAYS a donor payment IN. It never pays out to anyone — the school payout
 * stays on the E2 `PaymentProvider.createPayout` path (Constitution II). The provider only
 * initiates the deposit and returns a PENDING reference; the final status arrives later
 * via a signed webhook.
 */

import { LocalPaymentMethod } from '@prisma/client';

export interface InitiateDepositInput {
  /** Amount in the deposit currency, integer minor units. */
  readonly amountMinor: number;
  readonly currency: string;
  readonly method: LocalPaymentMethod;
  readonly country: string;
  /** Opaque payer handle (phone number / wallet id) — never stored raw in the prototype. */
  readonly payerRef?: string;
  readonly description?: string;
}

export interface InitiateDepositResult {
  /** PENDING until a signed webhook confirms SUCCEEDED/FAILED. */
  readonly status: 'PENDING' | 'FAILED';
  /** Stable reference the webhook will echo back. */
  readonly reference: string;
  readonly failureReason?: string;
}

export interface LocalDepositProvider {
  /** Initiate a local donor deposit; returns a PENDING reference (no money is captured yet). */
  initiateDeposit(input: InitiateDepositInput): Promise<InitiateDepositResult>;
}

export const LOCAL_DEPOSIT_PROVIDER = Symbol('LOCAL_DEPOSIT_PROVIDER');
