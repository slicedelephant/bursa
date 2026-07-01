import { Injectable, Logger } from '@nestjs/common';
import {
  InitiateDepositInput,
  InitiateDepositResult,
  LocalDepositProvider,
} from './local-payment.provider.interface';

/**
 * Real M-Pesa (Daraja STK-Push) adapter behind the same LocalDepositProvider seam.
 * Selected only when LOCAL_DEPOSIT_PROVIDER=mpesa AND MPESA_CONSUMER_KEY /
 * MPESA_CONSUMER_SECRET are present (see the factory); otherwise the deterministic Mock
 * is used, so the app runs with no keys.
 *
 * This is a compiling skeleton: it never runs in tests and makes no real HTTP call in the
 * prototype. A production implementation would obtain an OAuth token from Daraja, issue an
 * STK-Push and return the CheckoutRequestID as the PENDING reference; the signed webhook
 * (`POST /fx/webhook`) would later confirm SUCCEEDED/FAILED. The school payout still runs
 * on the E2 PaymentProvider — this adapter only initiates a donor DEPOSIT.
 */
@Injectable()
export class MpesaDepositProvider implements LocalDepositProvider {
  readonly name = 'mpesa';
  private readonly logger = new Logger(MpesaDepositProvider.name);

  constructor(
    private readonly consumerKey: string,
    private readonly consumerSecret: string,
  ) {
    if (!consumerKey || !consumerSecret) {
      throw new Error(
        'MpesaDepositProvider requires MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET',
      );
    }
  }

  async initiateDeposit(
    input: InitiateDepositInput,
  ): Promise<InitiateDepositResult> {
    // A real implementation would call the Daraja STK-Push endpoint here and return the
    // CheckoutRequestID. Kept as a skeleton so the prototype compiles without the SDK and
    // never hits the network in tests.
    this.logger.warn(
      `MpesaDepositProvider.initiateDeposit is a skeleton (${input.method}); returning a placeholder PENDING reference.`,
    );
    return {
      status: 'PENDING',
      reference: `mpesa_stk_${Date.now()}`,
    };
  }
}
