import { Logger } from '@nestjs/common';
import { DoubleTheDonationProvider } from './double-the-donation.provider';
import { EmployerMatchProvider } from './employer-match.provider.interface';
import { MockEmployerMatchProvider } from './mock-employer-match.provider';

export interface EmployerMatchProviderEnv {
  EMPLOYER_MATCH_PROVIDER?: string;
  DTD_API_KEY?: string;
}

/** True only when DTD is explicitly requested AND a key is configured. */
export function shouldUseDtd(env: EmployerMatchProviderEnv): boolean {
  return (
    (env.EMPLOYER_MATCH_PROVIDER ?? 'mock').toLowerCase() === 'dtd' &&
    !!env.DTD_API_KEY
  );
}

/**
 * Picks the employer-match provider from the environment. Default is the
 * deterministic Mock, which runs without any keys and never hits the network.
 * Double the Donation is used only when both the flag and the key are present;
 * if DTD selection fails for any reason we fall back to Mock so the app never
 * crashes. Mirrors `createPaymentProvider` / `createAmlProvider`.
 */
export function createEmployerMatchProvider(
  env: EmployerMatchProviderEnv,
  logger: Logger = new Logger('EmployerMatchProviderFactory'),
): EmployerMatchProvider {
  if (!shouldUseDtd(env)) {
    return new MockEmployerMatchProvider();
  }
  try {
    logger.log('Using DoubleTheDonationProvider (EMPLOYER_MATCH_PROVIDER=dtd)');
    return new DoubleTheDonationProvider(env.DTD_API_KEY as string);
  } catch (error) {
    logger.warn(
      `Double the Donation unavailable, falling back to Mock: ${(error as Error).message}`,
    );
    return new MockEmployerMatchProvider();
  }
}
