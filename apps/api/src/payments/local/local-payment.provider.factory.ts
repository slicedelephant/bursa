import { Logger } from '@nestjs/common';
import { LocalDepositProvider } from './local-payment.provider.interface';
import { MockLocalDepositProvider } from './mock-local-payment.provider';
import { MpesaDepositProvider } from './mpesa-payment.provider';

export interface LocalDepositProviderEnv {
  LOCAL_DEPOSIT_PROVIDER?: string;
  MPESA_CONSUMER_KEY?: string;
  MPESA_CONSUMER_SECRET?: string;
}

/** True only when M-Pesa is explicitly requested AND both keys are configured. */
export function shouldUseMpesa(env: LocalDepositProviderEnv): boolean {
  return (
    (env.LOCAL_DEPOSIT_PROVIDER ?? 'mock').toLowerCase() === 'mpesa' &&
    !!env.MPESA_CONSUMER_KEY &&
    !!env.MPESA_CONSUMER_SECRET
  );
}

/**
 * Picks the local-deposit provider from the environment. Default is the deterministic
 * Mock, which runs without any keys and never hits the network. M-Pesa is used only when
 * the flag and both keys are present; if selection fails for any reason we fall back to
 * Mock so the app never crashes. Mirrors `createPaymentProvider` (E2) exactly.
 */
export function createLocalDepositProvider(
  env: LocalDepositProviderEnv,
  logger: Logger = new Logger('LocalDepositProviderFactory'),
): LocalDepositProvider {
  if (!shouldUseMpesa(env)) {
    return new MockLocalDepositProvider();
  }
  try {
    logger.log('Using MpesaDepositProvider (LOCAL_DEPOSIT_PROVIDER=mpesa)');
    return new MpesaDepositProvider(
      env.MPESA_CONSUMER_KEY as string,
      env.MPESA_CONSUMER_SECRET as string,
    );
  } catch (error) {
    logger.warn(
      `M-Pesa unavailable, falling back to Mock: ${(error as Error).message}`,
    );
    return new MockLocalDepositProvider();
  }
}
