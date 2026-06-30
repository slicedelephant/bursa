import { Logger } from '@nestjs/common';
import {
  createIdentityProvider,
  shouldUsePersona,
} from './identity-provider.factory';
import { MockIdentityVerificationProvider } from './mock-identity-verification.provider';
import { PersonaIdentityProvider } from './persona-identity.provider';

describe('identity-provider.factory', () => {
  const silentLogger = {
    log: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  describe('shouldUsePersona', () => {
    it('is false by default (mock)', () => {
      expect(shouldUsePersona({})).toBe(false);
    });
    it('is false when persona requested without a key', () => {
      expect(shouldUsePersona({ KYC_PROVIDER: 'persona' })).toBe(false);
    });
    it('is true when persona requested with a key', () => {
      expect(
        shouldUsePersona({ KYC_PROVIDER: 'persona', PERSONA_API_KEY: 'k' }),
      ).toBe(true);
    });
  });

  describe('createIdentityProvider', () => {
    it('returns the Mock by default', () => {
      expect(createIdentityProvider({}, silentLogger)).toBeInstanceOf(
        MockIdentityVerificationProvider,
      );
    });

    it('returns Persona when flag + key are present', () => {
      const provider = createIdentityProvider(
        { KYC_PROVIDER: 'persona', PERSONA_API_KEY: 'k' },
        silentLogger,
      );
      expect(provider).toBeInstanceOf(PersonaIdentityProvider);
    });

    it('falls back to Mock when Persona construction throws', () => {
      const provider = createIdentityProvider(
        { KYC_PROVIDER: 'persona', PERSONA_API_KEY: '' },
        silentLogger,
      );
      expect(provider).toBeInstanceOf(MockIdentityVerificationProvider);
    });
  });
});
