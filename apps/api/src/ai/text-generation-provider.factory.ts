import { Logger } from '@nestjs/common';
import { ClaudeTextGenerationProvider } from './claude-text-generation.provider';
import { MockTextGenerationProvider } from './mock-text-generation.provider';
import { TextGenerationProvider } from './text-generation-provider.interface';

export interface TextGenerationProviderEnv {
  AI_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
}

/** True only when Claude is explicitly requested AND a key is configured. */
export function shouldUseClaude(env: TextGenerationProviderEnv): boolean {
  return (
    (env.AI_PROVIDER ?? 'mock').toLowerCase() === 'claude' &&
    !!env.ANTHROPIC_API_KEY
  );
}

/**
 * Picks the text-generation provider from the environment. Default is the
 * deterministic Mock, which runs without any keys and never hits the network.
 * Claude is used only when both the flag and the key are present; if Claude
 * selection fails for any reason we fall back to Mock so the app never crashes.
 */
export function createTextGenerationProvider(
  env: TextGenerationProviderEnv,
  logger: Logger = new Logger('TextGenerationProviderFactory'),
): TextGenerationProvider {
  if (!shouldUseClaude(env)) {
    return new MockTextGenerationProvider();
  }
  try {
    logger.log('Using ClaudeTextGenerationProvider (AI_PROVIDER=claude)');
    return new ClaudeTextGenerationProvider(
      env.ANTHROPIC_API_KEY as string,
      env.ANTHROPIC_MODEL || ClaudeTextGenerationProvider.DEFAULT_MODEL,
    );
  } catch (error) {
    logger.warn(
      `Claude unavailable, falling back to Mock: ${(error as Error).message}`,
    );
    return new MockTextGenerationProvider();
  }
}
