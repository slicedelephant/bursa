import { Injectable, Logger } from '@nestjs/common';
import {
  AmlScreenRequest,
  AmlScreenResult,
  AmlScreeningProvider,
} from './aml-screening.provider.interface';

/**
 * Real Sumsub adapter behind the same AmlScreeningProvider seam. Selected only
 * when AML_PROVIDER=sumsub AND a SUMSUB_API_KEY is present (see the factory);
 * otherwise the deterministic Mock is used, so the app runs with no keys and the
 * test suite never touches the network.
 *
 * It calls the Sumsub API over `fetch` (no SDK dependency), so this file compiles
 * with zero extra deps. It is NOT exercised in tests — only the mock runs there.
 */
@Injectable()
export class SumsubAmlProvider implements AmlScreeningProvider {
  readonly name = 'sumsub';
  private readonly logger = new Logger(SumsubAmlProvider.name);
  private static readonly BASE_URL = 'https://api.sumsub.com';

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error('SumsubAmlProvider requires SUMSUB_API_KEY');
    }
  }

  async screen(request: AmlScreenRequest): Promise<AmlScreenResult> {
    try {
      const res = await fetch(
        `${SumsubAmlProvider.BASE_URL}/resources/applicants/-/aml/screen`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-app-token': this.apiKey,
          },
          body: JSON.stringify({
            name: request.subjectName,
            country: request.country,
            amount: request.amountCents,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`Sumsub API returned ${res.status}`);
      }
      const json = (await res.json()) as {
        id?: string;
        review?: { reviewResult?: { reviewAnswer?: string } };
      };
      const hit = json?.review?.reviewResult?.reviewAnswer === 'RED';
      return { hit, reference: String(json?.id ?? 'sumsub_unknown') };
    } catch (error) {
      this.logger.error('Sumsub screening failed', error as Error);
      throw error instanceof Error
        ? error
        : new Error('Sumsub screening failed');
    }
  }
}
