import { Logger } from '@nestjs/common';
import { DoubleTheDonationProvider } from './double-the-donation.provider';
import {
  createEmployerMatchProvider,
  shouldUseDtd,
} from './employer-match-provider.factory';
import { MockEmployerMatchProvider } from './mock-employer-match.provider';

describe('employer-match-provider.factory', () => {
  const silentLogger = {
    log: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  describe('shouldUseDtd', () => {
    it('is false by default (mock)', () => {
      expect(shouldUseDtd({})).toBe(false);
    });
    it('is false when dtd requested without a key', () => {
      expect(shouldUseDtd({ EMPLOYER_MATCH_PROVIDER: 'dtd' })).toBe(false);
    });
    it('is true when dtd requested with a key', () => {
      expect(
        shouldUseDtd({ EMPLOYER_MATCH_PROVIDER: 'dtd', DTD_API_KEY: 'k' }),
      ).toBe(true);
    });
  });

  describe('createEmployerMatchProvider', () => {
    it('returns the Mock by default', () => {
      expect(createEmployerMatchProvider({}, silentLogger)).toBeInstanceOf(
        MockEmployerMatchProvider,
      );
    });

    it('returns DTD when flag + key are present', () => {
      expect(
        createEmployerMatchProvider(
          { EMPLOYER_MATCH_PROVIDER: 'dtd', DTD_API_KEY: 'k' },
          silentLogger,
        ),
      ).toBeInstanceOf(DoubleTheDonationProvider);
    });

    it('falls back to Mock when DTD is not usable', () => {
      expect(
        createEmployerMatchProvider(
          { EMPLOYER_MATCH_PROVIDER: 'dtd', DTD_API_KEY: '' },
          silentLogger,
        ),
      ).toBeInstanceOf(MockEmployerMatchProvider);
    });
  });
});
