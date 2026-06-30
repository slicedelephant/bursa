import { Logger } from '@nestjs/common';
import { MockPaymentProvider } from './mock-payment.provider';
import {
  createPaymentProvider,
  shouldUseStripe,
} from './payment-provider.factory';
import { StripePaymentProvider } from './stripe-payment.provider';

describe('payment-provider.factory', () => {
  const silentLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  describe('shouldUseStripe', () => {
    it('is false by default (no flag)', () => {
      expect(shouldUseStripe({})).toBe(false);
    });

    it('is false when flag is stripe but no key', () => {
      expect(shouldUseStripe({ PAYMENT_PROVIDER: 'stripe' })).toBe(false);
    });

    it('is false when flag is mock even with a key', () => {
      expect(
        shouldUseStripe({
          PAYMENT_PROVIDER: 'mock',
          STRIPE_SECRET_KEY: 'sk_test',
        }),
      ).toBe(false);
    });

    it('is true only when flag is stripe and a key is present', () => {
      expect(
        shouldUseStripe({
          PAYMENT_PROVIDER: 'STRIPE',
          STRIPE_SECRET_KEY: 'sk_test',
        }),
      ).toBe(true);
    });
  });

  describe('createPaymentProvider', () => {
    it('returns Mock by default', () => {
      expect(createPaymentProvider({}, silentLogger)).toBeInstanceOf(
        MockPaymentProvider,
      );
    });

    it('returns Mock when stripe requested but key missing', () => {
      expect(
        createPaymentProvider({ PAYMENT_PROVIDER: 'stripe' }, silentLogger),
      ).toBeInstanceOf(MockPaymentProvider);
    });

    it('returns Stripe when flag + key present and the SDK loads', () => {
      jest.spyOn(StripePaymentProvider, 'loadSdk').mockReturnValue(
        class FakeStripe {
          constructor(public key: string) {}
        },
      );
      const provider = createPaymentProvider(
        { PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk_test_123' },
        silentLogger,
      );
      expect(provider).toBeInstanceOf(StripePaymentProvider);
    });

    it('falls back to Mock when Stripe construction throws (e.g. SDK absent)', () => {
      jest.spyOn(StripePaymentProvider, 'loadSdk').mockImplementation(() => {
        throw new Error('stripe not installed');
      });
      const provider = createPaymentProvider(
        { PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk_test_123' },
        silentLogger,
      );
      expect(provider).toBeInstanceOf(MockPaymentProvider);
    });

    afterEach(() => jest.restoreAllMocks());
  });
});
