import { Logger } from '@nestjs/common';
import { FxRateProvider } from './fx-rate.provider.interface';
import { MockFxRateProvider } from './mock-fx-rate.provider';

export interface FxRateProviderEnv {
  FX_RATE_PROVIDER?: string;
}

/** True only when a real FX provider is explicitly requested. */
export function shouldUseRealFx(env: FxRateProviderEnv): boolean {
  const value = (env.FX_RATE_PROVIDER ?? 'mock').toLowerCase();
  return value !== 'mock' && value.length > 0;
}

/**
 * Picks the FX-rate provider from the environment. Default is the deterministic Mock,
 * which needs no keys and never hits the network. There is no real FX adapter in the
 * prototype (out of scope), so any non-mock request logs and falls back to Mock — the app
 * never crashes. Mirrors the E2 payment-provider factory shape.
 */
export function createFxRateProvider(
  env: FxRateProviderEnv,
  logger: Logger = new Logger('FxRateProviderFactory'),
): FxRateProvider {
  if (shouldUseRealFx(env)) {
    logger.warn(
      `FX_RATE_PROVIDER=${env.FX_RATE_PROVIDER} has no real adapter in the prototype; using Mock.`,
    );
  }
  return new MockFxRateProvider();
}
