import { createHash } from 'crypto';
import {
  EsignatureProvider,
  SignAgreementInput,
  SignedAgreement,
} from './e-signature.provider.interface';

/**
 * Deterministic mock e-signature provider (E8). Produces a stable agreement
 * reference from the school + signer + timestamp; makes NO network call. The
 * clock is injectable so the reference and timestamp are testable.
 */
export class MockEsignatureProvider implements EsignatureProvider {
  constructor(private readonly clock: () => Date = () => new Date()) {}

  async signAgreement(input: SignAgreementInput): Promise<SignedAgreement> {
    const signerName = input.signerName?.trim();
    if (!signerName) {
      throw new Error('signerName is required to sign the agreement');
    }
    const signedAt = this.clock();
    const fingerprint = createHash('sha256')
      .update(`${input.schoolId}:${signerName}:${signedAt.getTime()}`)
      .digest('hex')
      .slice(0, 16);
    return {
      provider: 'mock',
      agreementRef: `mock_esign_${fingerprint}`,
      signerName,
      signedAt,
    };
  }
}
