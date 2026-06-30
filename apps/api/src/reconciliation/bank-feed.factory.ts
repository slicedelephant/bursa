import { Logger } from '@nestjs/common';
import { BankFeedProvider } from './bank-feed.provider.interface';
import { MockBankFeedProvider } from './mock-bank-feed.provider';
import { PlaidBankFeedProvider } from './plaid-bank-feed.provider';

export interface BankFeedEnv {
  BANK_FEED_PROVIDER?: string;
  PLAID_SECRET?: string;
  PLAID_CLIENT_ID?: string;
}

/** True only when Plaid is explicitly requested AND a secret is configured. */
export function shouldUsePlaid(env: BankFeedEnv): boolean {
  return (
    (env.BANK_FEED_PROVIDER ?? 'mock').toLowerCase() === 'plaid' &&
    !!env.PLAID_SECRET
  );
}

/**
 * Picks the bank-feed provider from the environment. Default is the deterministic
 * Mock, which runs without any keys and never hits the network. Plaid is used only
 * when both the flag and the secret are present; if Plaid selection fails for any
 * reason we fall back to Mock so the app never crashes. Mirrors
 * `createPaymentProvider`.
 */
export function createBankFeedProvider(
  env: BankFeedEnv,
  logger: Logger = new Logger('BankFeedProviderFactory'),
): BankFeedProvider {
  if (!shouldUsePlaid(env)) {
    return new MockBankFeedProvider();
  }
  try {
    logger.log('Using PlaidBankFeedProvider (BANK_FEED_PROVIDER=plaid)');
    return new PlaidBankFeedProvider(
      env.PLAID_SECRET as string,
      env.PLAID_CLIENT_ID ?? '',
    );
  } catch (error) {
    logger.warn(
      `Plaid unavailable, falling back to Mock: ${(error as Error).message}`,
    );
    return new MockBankFeedProvider();
  }
}
