import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ChargeInput,
  PaymentProvider,
  PaymentResult,
  PayoutInput,
  PayoutResult,
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
    return this.charge(input, 'card');
  }

  async createSepaPledge(input: ChargeInput): Promise<PaymentResult> {
    return this.charge(input, 'sepa');
  }

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    return {
      status: 'SENT',
      reference: `mock_payout_${randomUUID()}`,
    };
  }

  private charge(input: ChargeInput, kind: 'card' | 'sepa'): PaymentResult {
    const reference = `mock_${kind}_${randomUUID()}`;
    if (input.amountCents % 100 === MockPaymentProvider.FAIL_SENTINEL) {
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
