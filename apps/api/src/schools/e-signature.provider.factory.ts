import { Logger } from '@nestjs/common';
import { EsignatureProvider } from './e-signature.provider.interface';
import { MockEsignatureProvider } from './mock-e-signature.provider';

export interface EsignatureProviderEnv {
  ESIGNATURE_PROVIDER?: string;
  DOCUSIGN_API_KEY?: string;
}

/** True only when DocuSign is explicitly requested AND an API key is configured. */
export function shouldUseDocusign(env: EsignatureProviderEnv): boolean {
  return (
    (env.ESIGNATURE_PROVIDER ?? 'mock').toLowerCase() === 'docusign' &&
    !!env.DOCUSIGN_API_KEY
  );
}

/**
 * Picks the e-signature provider from the environment. The prototype only ships
 * the deterministic Mock — a real DocuSign adapter is intentionally out of scope,
 * so we log and fall back to Mock if it is ever requested. The app therefore runs
 * with no keys and never makes an external call.
 */
export function createEsignatureProvider(
  env: EsignatureProviderEnv,
  logger: Logger = new Logger('EsignatureProviderFactory'),
): EsignatureProvider {
  if (shouldUseDocusign(env)) {
    logger.warn(
      'DocuSign provider is not implemented in the prototype — falling back to MockEsignatureProvider.',
    );
  }
  return new MockEsignatureProvider();
}
