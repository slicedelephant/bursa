import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentOcrRequest,
  DocumentOcrResult,
  IdentityVerificationProvider,
  LivenessCheckRequest,
  LivenessCheckResult,
} from './identity-verification.provider.interface';

/**
 * Real Persona (Onfido-style) adapter behind the same IdentityVerificationProvider
 * seam. Selected only when KYC_PROVIDER=persona AND a PERSONA_API_KEY is present
 * (see the factory); otherwise the deterministic Mock is used, so the app runs
 * with no keys and the test suite never touches the network.
 *
 * It calls the Persona API over `fetch` (no SDK dependency, mirroring how the AI
 * coach calls Anthropic and the seed calls OpenAI), so this file compiles with
 * zero extra deps. It is NOT exercised in tests — only the mock runs there.
 */
@Injectable()
export class PersonaIdentityProvider implements IdentityVerificationProvider {
  readonly name = 'persona';
  private readonly logger = new Logger(PersonaIdentityProvider.name);
  private static readonly BASE_URL = 'https://api.withpersona.com/api/v1';

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error('PersonaIdentityProvider requires PERSONA_API_KEY');
    }
  }

  async checkLiveness(
    request: LivenessCheckRequest,
  ): Promise<LivenessCheckResult> {
    const json = await this.post('/inquiries', {
      'liveness-token': request.livenessToken,
    });
    const confidence = Number(json?.data?.attributes?.confidence ?? 0);
    const reference = String(json?.data?.id ?? 'persona_unknown');
    return { confidence, reference };
  }

  async extractDocument(
    request: DocumentOcrRequest,
  ): Promise<DocumentOcrResult> {
    const json = await this.post('/documents/government-id', {
      'document-token': request.documentToken,
    });
    const attrs = json?.data?.attributes ?? {};
    return {
      extractedName: String(attrs['name-first-last'] ?? request.claimedName),
      extractedSchool: attrs['issuing-authority']
        ? String(attrs['issuing-authority'])
        : undefined,
      extractedDegree: attrs['degree'] ? String(attrs['degree']) : undefined,
      reference: String(json?.data?.id ?? 'persona_unknown'),
    };
  }

  private async post(
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ data?: { id?: string; attributes?: Record<string, unknown> } }> {
    try {
      const res = await fetch(`${PersonaIdentityProvider.BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ data: { attributes: body } }),
      });
      if (!res.ok) {
        throw new Error(`Persona API returned ${res.status}`);
      }
      return (await res.json()) as {
        data?: { id?: string; attributes?: Record<string, unknown> };
      };
    } catch (error) {
      this.logger.error('Persona request failed', error as Error);
      throw error instanceof Error
        ? error
        : new Error('Persona request failed');
    }
  }
}
