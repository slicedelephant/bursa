import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  DocumentOcrRequest,
  DocumentOcrResult,
  IdentityVerificationProvider,
  LivenessCheckRequest,
  LivenessCheckResult,
} from './identity-verification.provider.interface';

/**
 * Deterministic mock identity provider — no external calls. Demoable sentinels
 * (mirroring MockPaymentProvider's `.13`):
 *  - a livenessToken ending in `-FAIL` returns a low confidence (→ fails the
 *    pure liveness-result evaluator); anything else returns a high confidence.
 *  - a documentToken ending in `-MISMATCH` returns a deliberately different
 *    extracted name (→ fails the pure name matcher); anything else echoes the
 *    claimed name so the happy path (claimed === admission) is exercisable.
 * References are mock UUIDs.
 */
@Injectable()
export class MockIdentityVerificationProvider implements IdentityVerificationProvider {
  readonly name = 'mock';

  private static readonly PASS_CONFIDENCE = 92;
  private static readonly FAIL_CONFIDENCE = 35;

  async checkLiveness(
    request: LivenessCheckRequest,
  ): Promise<LivenessCheckResult> {
    const fails = (request.livenessToken ?? '').toUpperCase().endsWith('-FAIL');
    return {
      confidence: fails
        ? MockIdentityVerificationProvider.FAIL_CONFIDENCE
        : MockIdentityVerificationProvider.PASS_CONFIDENCE,
      reference: `mock_liveness_${randomUUID()}`,
    };
  }

  async extractDocument(
    request: DocumentOcrRequest,
  ): Promise<DocumentOcrResult> {
    const mismatch = (request.documentToken ?? '')
      .toUpperCase()
      .endsWith('-MISMATCH');
    return {
      extractedName: mismatch
        ? 'Someone Else Entirely'
        : (request.claimedName ?? ''),
      extractedSchool: 'On-file partner school',
      extractedDegree: 'MBA',
      reference: `mock_document_${randomUUID()}`,
    };
  }
}
