import { Injectable, Logger } from '@nestjs/common';
import {
  GenerateRequest,
  GenerateResult,
  TextGenerationProvider,
} from './text-generation-provider.interface';

/**
 * Real Claude (Anthropic) adapter behind the same TextGenerationProvider seam.
 * Selected only when AI_PROVIDER=claude AND an ANTHROPIC_API_KEY is present (see
 * the factory); otherwise the deterministic Mock is used, so the app runs with
 * no keys and the test suite never touches the network.
 *
 * It calls the Anthropic Messages API over `fetch` (no SDK dependency, mirroring
 * how the seed script calls OpenAI), so this file compiles with zero extra deps.
 * It is NOT exercised in tests — only the mock runs there.
 */
@Injectable()
export class ClaudeTextGenerationProvider implements TextGenerationProvider {
  readonly name = 'claude';
  private readonly logger = new Logger(ClaudeTextGenerationProvider.name);
  private static readonly ENDPOINT = 'https://api.anthropic.com/v1/messages';
  private static readonly API_VERSION = '2023-06-01';
  /** Drafting default; swap to `claude-opus-4-8` for the strongest reasoning. */
  static readonly DEFAULT_MODEL = 'claude-sonnet-4-6';

  private readonly model: string;

  constructor(
    private readonly apiKey: string,
    model: string = ClaudeTextGenerationProvider.DEFAULT_MODEL,
  ) {
    if (!apiKey) {
      throw new Error('ClaudeTextGenerationProvider requires ANTHROPIC_API_KEY');
    }
    this.model = ClaudeTextGenerationProvider.resolveModel(model);
  }

  /**
   * Validates/normalizes the model id at construction. A seam (like Stripe's
   * `loadSdk`) the factory test can force to throw to exercise the Mock fallback.
   */
  static resolveModel(model: string): string {
    return model && model.trim().length > 0
      ? model
      : ClaudeTextGenerationProvider.DEFAULT_MODEL;
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    try {
      const res = await fetch(ClaudeTextGenerationProvider.ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ClaudeTextGenerationProvider.API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: request.prompt.system,
          messages: [{ role: 'user', content: request.prompt.user }],
        }),
      });
      if (!res.ok) {
        throw new Error(`Anthropic API returned ${res.status}`);
      }
      const json = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text =
        json.content
          ?.filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join('\n') ?? '';
      const variants = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, Math.max(1, request.variants));
      return { variants, provider: this.name };
    } catch (error) {
      this.logger.error('Claude generation failed', error as Error);
      throw error instanceof Error
        ? error
        : new Error('Claude generation failed');
    }
  }
}
