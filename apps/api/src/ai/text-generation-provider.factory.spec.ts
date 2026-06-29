import { Logger } from '@nestjs/common';
import { ClaudeTextGenerationProvider } from './claude-text-generation.provider';
import { MockTextGenerationProvider } from './mock-text-generation.provider';
import {
  createTextGenerationProvider,
  shouldUseClaude,
} from './text-generation-provider.factory';

describe('text-generation-provider.factory', () => {
  const silentLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  describe('shouldUseClaude', () => {
    it('is false by default (no flag)', () => {
      expect(shouldUseClaude({})).toBe(false);
    });

    it('is false when flag is claude but no key', () => {
      expect(shouldUseClaude({ AI_PROVIDER: 'claude' })).toBe(false);
    });

    it('is false when flag is mock even with a key', () => {
      expect(
        shouldUseClaude({ AI_PROVIDER: 'mock', ANTHROPIC_API_KEY: 'sk-ant' }),
      ).toBe(false);
    });

    it('is true only when flag is claude and a key is present', () => {
      expect(
        shouldUseClaude({ AI_PROVIDER: 'CLAUDE', ANTHROPIC_API_KEY: 'sk-ant' }),
      ).toBe(true);
    });
  });

  describe('createTextGenerationProvider', () => {
    it('returns Mock by default', () => {
      expect(createTextGenerationProvider({}, silentLogger)).toBeInstanceOf(
        MockTextGenerationProvider,
      );
    });

    it('returns Mock when claude requested but key missing', () => {
      expect(
        createTextGenerationProvider({ AI_PROVIDER: 'claude' }, silentLogger),
      ).toBeInstanceOf(MockTextGenerationProvider);
    });

    it('returns Claude when flag + key present', () => {
      const provider = createTextGenerationProvider(
        { AI_PROVIDER: 'claude', ANTHROPIC_API_KEY: 'sk-ant-123' },
        silentLogger,
      );
      expect(provider).toBeInstanceOf(ClaudeTextGenerationProvider);
    });

    it('falls back to Mock when Claude construction throws', () => {
      // Force construction to fail even though the env says claude + key.
      const spy = jest
        .spyOn(ClaudeTextGenerationProvider, 'resolveModel')
        .mockImplementation(() => {
          throw new Error('boom during construction');
        });
      const provider = createTextGenerationProvider(
        { AI_PROVIDER: 'claude', ANTHROPIC_API_KEY: 'sk-ant-123' },
        silentLogger,
      );
      expect(provider).toBeInstanceOf(MockTextGenerationProvider);
      spy.mockRestore();
    });

    afterEach(() => jest.restoreAllMocks());
  });
});
