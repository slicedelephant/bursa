import { Logger } from '@nestjs/common';
import { createAmlProvider, shouldUseSumsub } from './aml-provider.factory';
import { MockAmlScreeningProvider } from './mock-aml-screening.provider';
import { SumsubAmlProvider } from './sumsub-aml.provider';

describe('aml-provider.factory', () => {
  const silentLogger = {
    log: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  describe('shouldUseSumsub', () => {
    it('is false by default (mock)', () => {
      expect(shouldUseSumsub({})).toBe(false);
    });
    it('is false when sumsub requested without a key', () => {
      expect(shouldUseSumsub({ AML_PROVIDER: 'sumsub' })).toBe(false);
    });
    it('is true when sumsub requested with a key', () => {
      expect(
        shouldUseSumsub({ AML_PROVIDER: 'sumsub', SUMSUB_API_KEY: 'k' }),
      ).toBe(true);
    });
  });

  describe('createAmlProvider', () => {
    it('returns the Mock by default', () => {
      expect(createAmlProvider({}, silentLogger)).toBeInstanceOf(
        MockAmlScreeningProvider,
      );
    });

    it('returns Sumsub when flag + key are present', () => {
      expect(
        createAmlProvider(
          { AML_PROVIDER: 'sumsub', SUMSUB_API_KEY: 'k' },
          silentLogger,
        ),
      ).toBeInstanceOf(SumsubAmlProvider);
    });

    it('falls back to Mock when Sumsub is not usable', () => {
      expect(
        createAmlProvider(
          { AML_PROVIDER: 'sumsub', SUMSUB_API_KEY: '' },
          silentLogger,
        ),
      ).toBeInstanceOf(MockAmlScreeningProvider);
    });
  });
});
