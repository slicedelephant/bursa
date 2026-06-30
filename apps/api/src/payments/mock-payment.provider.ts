import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CaptureInput,
  ChargeInput,
  PaymentProvider,
  PaymentResult,
  PayoutInput,
  PayoutResult,
  PledgeResult,
} from './payment-provider.interface';

/**
 * Deterministic mock — no external calls. Any amount succeeds EXCEPT amounts
 * whose last two cent digits are `13` (amountCents % 100 === 13), which fail,
 * so the failure path is demoable. References are mock UUIDs.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private static readonly FAIL_SENTINEL = 13;

  async createCardCharge(input: ChargeInput): Promise<PaymentResult> {
    return this.charge(input.amountCents, 'card');
  }

  async createSepaPledge(input: ChargeInput): Promise<PaymentResult> {
    return this.charge(input.amountCents, 'sepa');
  }

  async chargeImmediately(input: ChargeInput): Promise<PaymentResult> {
    return this.charge(input.amountCents, 'charge');
  }

  async savePledge(input: ChargeInput): Promise<PledgeResult> {
    const pledgeRef = `mock_pledge_${randomUUID()}`;
    if (this.fails(input.amountCents)) {
      return {
        status: 'FAILED',
        pledgeRef,
        failureReason:
          'Card could not be authorized (mock sentinel: amount ending in .13)',
      };
    }
    return { status: 'AUTHORIZED', pledgeRef };
  }

  async captureOnGoalReached(input: CaptureInput): Promise<PaymentResult> {
    return this.charge(input.amountCents, 'capture');
  }

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    return this.payout(input);
  }

  async payoutToSchool(input: PayoutInput): Promise<PayoutResult> {
    return this.payout(input);
  }

  private payout(_input: PayoutInput): PayoutResult {
    return { status: 'SENT', reference: `mock_payout_${randomUUID()}` };
  }

  private fails(amountCents: number): boolean {
    return amountCents % 100 === MockPaymentProvider.FAIL_SENTINEL;
  }

  private charge(amountCents: number, kind: string): PaymentResult {
    const reference = `mock_${kind}_${randomUUID()}`;
    if (this.fails(amountCents)) {
      return {
        status: 'FAILED',
        reference,
        failureReason:
          'Payment declined (mock test sentinel: amount ending in .13)',
      };
    }
    return { status: 'SUCCEEDED', reference };
  }
}
