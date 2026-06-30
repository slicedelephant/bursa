import { Logger } from '@nestjs/common';
import { IdentityVerificationProvider } from './identity-verification.provider.interface';
import { MockIdentityVerificationProvider } from './mock-identity-verification.provider';
import { PersonaIdentityProvider } from './persona-identity.provider';

export interface IdentityProviderEnv {
  KYC_PROVIDER?: string;
  PERSONA_API_KEY?: string;
}

/** True only when Persona is explicitly requested AND a key is configured. */
export function shouldUsePersona(env: IdentityProviderEnv): boolean {
  return (
    (env.KYC_PROVIDER ?? 'mock').toLowerCase() === 'persona' &&
    !!env.PERSONA_API_KEY
  );
}

/**
 * Picks the identity provider from the environment. Default is the deterministic
 * Mock, which runs without any keys and never hits the network. Persona is used
 * only when both the flag and the key are present; if Persona selection fails
 * for any reason we fall back to Mock so the app never crashes. Mirrors
 * `createPaymentProvider`.
 */
export function createIdentityProvider(
  env: IdentityProviderEnv,
  logger: Logger = new Logger('IdentityProviderFactory'),
): IdentityVerificationProvider {
  if (!shouldUsePersona(env)) {
    return new MockIdentityVerificationProvider();
  }
  try {
    logger.log('Using PersonaIdentityProvider (KYC_PROVIDER=persona)');
    return new PersonaIdentityProvider(env.PERSONA_API_KEY as string);
  } catch (error) {
    logger.warn(
      `Persona unavailable, falling back to Mock: ${(error as Error).message}`,
    );
    return new MockIdentityVerificationProvider();
  }
}
