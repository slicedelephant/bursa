import { Injectable, Logger } from '@nestjs/common';
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
 * Real Stripe adapter behind the same PaymentProvider seam. Selected only when
 * PAYMENT_PROVIDER=stripe AND a STRIPE_SECRET_KEY is present (see the factory);
 * otherwise the deterministic Mock is used, so the app runs with no keys.
 *
 * The `stripe` SDK is loaded lazily via require so the project compiles and the
 * test suite stays green even when the optional dependency is not installed.
 * Maps the All-or-Nothing flow to Stripe primitives:
 *   savePledge            -> SetupIntent (usage=off_session) — method + SCA, no charge
 *   captureOnGoalReached  -> off_session PaymentIntent on the saved method
 *   payoutToSchool        -> Transfer / Payout to the school's account
 */
@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(StripePaymentProvider.name);
  private readonly stripe: any;

  constructor(secretKey: string) {
    if (!secretKey) {
      throw new Error('StripePaymentProvider requires STRIPE_SECRET_KEY');
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = StripePaymentProvider.loadSdk();
    this.stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
  }

  /** Loads the optional `stripe` SDK; throws a clear error if it is absent. */
  static loadSdk(): any {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      return require('stripe');
    } catch {
      throw new Error(
        'The "stripe" package is not installed. Run `npm i stripe` in apps/api to use PAYMENT_PROVIDER=stripe.',
      );
    }
  }

  async savePledge(input: ChargeInput): Promise<PledgeResult> {
    try {
      const intent = await this.stripe.setupIntents.create({
        usage: 'off_session',
        payment_method_types:
          input.method === 'SEPA' ? ['sepa_debit'] : ['card'],
        metadata: { kind: 'pledge', description: input.description ?? '' },
      });
      return { status: 'AUTHORIZED', pledgeRef: intent.id };
    } catch (error) {
      return this.failPledge(error);
    }
  }

  async captureOnGoalReached(input: CaptureInput): Promise<PaymentResult> {
    try {
      const setup = await this.stripe.setupIntents.retrieve(input.pledgeRef);
      const intent = await this.stripe.paymentIntents.create({
        amount: input.amountCents,
        currency: input.currency.toLowerCase(),
        customer: setup.customer ?? undefined,
        payment_method: setup.payment_method ?? undefined,
        off_session: true,
        confirm: true,
        description: input.description,
      });
      return { status: 'SUCCEEDED', reference: intent.id };
    } catch (error) {
      return this.failPayment(error);
    }
  }

  async createCardCharge(input: ChargeInput): Promise<PaymentResult> {
    return this.chargeNow(input);
  }

  async createSepaPledge(input: ChargeInput): Promise<PaymentResult> {
    return this.chargeNow(input);
  }

  async chargeImmediately(input: ChargeInput): Promise<PaymentResult> {
    return this.chargeNow(input);
  }

  async createPayout(input: PayoutInput): Promise<PayoutResult> {
    return this.payout(input);
  }

  async payoutToSchool(input: PayoutInput): Promise<PayoutResult> {
    return this.payout(input);
  }

  private async chargeNow(input: ChargeInput): Promise<PaymentResult> {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: input.amountCents,
        currency: input.currency.toLowerCase(),
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        description: input.description,
      });
      return { status: 'SUCCEEDED', reference: intent.id };
    } catch (error) {
      return this.failPayment(error);
    }
  }

  private async payout(input: PayoutInput): Promise<PayoutResult> {
    try {
      const transfer = await this.stripe.transfers.create({
        amount: input.amountCents,
        currency: input.currency.toLowerCase(),
        destination: input.accountRef,
        description:
          input.description ?? `Tuition payout to ${input.schoolName}`,
      });
      return { status: 'SENT', reference: transfer.id };
    } catch (error) {
      this.logger.error('Stripe payout failed', error as Error);
      return {
        status: 'FAILED',
        reference: 'stripe_payout_failed',
        failureReason: this.reason(error),
      };
    }
  }

  private failPledge(error: unknown): PledgeResult {
    this.logger.error('Stripe savePledge failed', error as Error);
    return {
      status: 'FAILED',
      pledgeRef: 'stripe_pledge_failed',
      failureReason: this.reason(error),
    };
  }

  private failPayment(error: unknown): PaymentResult {
    this.logger.error('Stripe charge failed', error as Error);
    return {
      status: 'FAILED',
      reference: 'stripe_charge_failed',
      failureReason: this.reason(error),
    };
  }

  private reason(error: unknown): string {
    return error instanceof Error ? error.message : 'Stripe request failed';
  }
}
