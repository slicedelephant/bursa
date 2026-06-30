import { Logger } from '@nestjs/common';
import { AmlScreeningProvider } from './aml-screening.provider.interface';
import { MockAmlScreeningProvider } from './mock-aml-screening.provider';
import { SumsubAmlProvider } from './sumsub-aml.provider';

export interface AmlProviderEnv {
  AML_PROVIDER?: string;
  SUMSUB_API_KEY?: string;
}

/** True only when Sumsub is explicitly requested AND a key is configured. */
export function shouldUseSumsub(env: AmlProviderEnv): boolean {
  return (
    (env.AML_PROVIDER ?? 'mock').toLowerCase() === 'sumsub' &&
    !!env.SUMSUB_API_KEY
  );
}

/**
 * Picks the AML provider from the environment. Default is the deterministic Mock,
 * which runs without any keys and never hits the network. Sumsub is used only
 * when both the flag and the key are present; if Sumsub selection fails for any
 * reason we fall back to Mock so the app never crashes. Mirrors
 * `createPaymentProvider`.
 */
export function createAmlProvider(
  env: AmlProviderEnv,
  logger: Logger = new Logger('AmlProviderFactory'),
): AmlScreeningProvider {
  if (!shouldUseSumsub(env)) {
    return new MockAmlScreeningProvider();
  }
  try {
    logger.log('Using SumsubAmlProvider (AML_PROVIDER=sumsub)');
    return new SumsubAmlProvider(env.SUMSUB_API_KEY as string);
  } catch (error) {
    logger.warn(
      `Sumsub unavailable, falling back to Mock: ${(error as Error).message}`,
    );
    return new MockAmlScreeningProvider();
  }
}
