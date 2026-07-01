import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  InitiateDepositInput,
  InitiateDepositResult,
  LocalDepositProvider,
} from './local-payment.provider.interface';

/**
 * Deterministic mock local-deposit provider — no external calls. Mirrors
 * MockPaymentProvider's demoable sentinel: an amount whose last two minor digits are
 * `13` (amountMinor % 100 === 13) fails immediately, so the failure path is exercisable;
 * every other amount returns a PENDING reference (the webhook later confirms it).
 * References are mock UUIDs.
 */
@Injectable()
export class MockLocalDepositProvider implements LocalDepositProvider {
  readonly name = 'mock';

  private static readonly FAIL_SENTINEL = 13;

  async initiateDeposit(
    input: InitiateDepositInput,
  ): Promise<InitiateDepositResult> {
    const reference = `mock_local_${input.method.toLowerCase()}_${randomUUID()}`;
    if (this.fails(input.amountMinor)) {
      return {
        status: 'FAILED',
        reference,
        failureReason:
          'Local deposit could not be initiated (mock sentinel: amount ending in .13)',
      };
    }
    return { status: 'PENDING', reference };
  }

  private fails(amountMinor: number): boolean {
    return amountMinor % 100 === MockLocalDepositProvider.FAIL_SENTINEL;
  }
}
