import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AmlScreenRequest,
  AmlScreenResult,
  AmlScreeningProvider,
} from './aml-screening.provider.interface';

/**
 * Deterministic mock AML provider — no external calls. It reports a raw
 * watchlist `hit` when the subject name contains the demoable sentinel
 * `WATCHLIST` (case-insensitive); otherwise no hit. The actual CLEAR/HIT/BLOCKED
 * decision (including sanctioned-country handling) is made by the pure
 * `aml-decision.ts`. References are mock UUIDs.
 */
@Injectable()
export class MockAmlScreeningProvider implements AmlScreeningProvider {
  readonly name = 'mock';

  async screen(request: AmlScreenRequest): Promise<AmlScreenResult> {
    const hit = (request.subjectName ?? '').toUpperCase().includes('WATCHLIST');
    return { hit, reference: `mock_aml_${randomUUID()}` };
  }
}
