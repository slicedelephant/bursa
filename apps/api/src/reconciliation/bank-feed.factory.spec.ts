import { Logger } from '@nestjs/common';
import { createBankFeedProvider, shouldUsePlaid } from './bank-feed.factory';
import { MockBankFeedProvider } from './mock-bank-feed.provider';
import { PlaidBankFeedProvider } from './plaid-bank-feed.provider';

const silentLogger = () =>
  ({ log: jest.fn(), warn: jest.fn(), error: jest.fn() }) as unknown as Logger;

describe('bank-feed.factory', () => {
  describe('shouldUsePlaid', () => {
    it('is false by default (mock)', () => {
      expect(shouldUsePlaid({})).toBe(false);
    });
    it('is false when plaid requested but no secret', () => {
      expect(shouldUsePlaid({ BANK_FEED_PROVIDER: 'plaid' })).toBe(false);
    });
    it('is true when plaid requested and secret present', () => {
      expect(
        shouldUsePlaid({ BANK_FEED_PROVIDER: 'plaid', PLAID_SECRET: 'sk' }),
      ).toBe(true);
    });
    it('is case-insensitive', () => {
      expect(
        shouldUsePlaid({ BANK_FEED_PROVIDER: 'PLAID', PLAID_SECRET: 'sk' }),
      ).toBe(true);
    });
  });

  describe('createBankFeedProvider', () => {
    it('returns the Mock by default', () => {
      expect(createBankFeedProvider({}, silentLogger())).toBeInstanceOf(
        MockBankFeedProvider,
      );
    });

    it('returns the Mock when plaid requested without a secret', () => {
      expect(
        createBankFeedProvider({ BANK_FEED_PROVIDER: 'plaid' }, silentLogger()),
      ).toBeInstanceOf(MockBankFeedProvider);
    });

    it('returns Plaid when flag + secret are present', () => {
      const provider = createBankFeedProvider(
        { BANK_FEED_PROVIDER: 'plaid', PLAID_SECRET: 'sk-test' },
        silentLogger(),
      );
      expect(provider).toBeInstanceOf(PlaidBankFeedProvider);
    });
  });
});
