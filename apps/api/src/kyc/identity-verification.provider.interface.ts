/**
 * The single seam between KYC identity verification and any identity provider
 * (Persona / Onfido / Sumsub). The prototype ships MockIdentityVerificationProvider;
 * a real adapter must implement this same interface with zero domain changes.
 * No real identity call is made anywhere in the prototype.
 *
 * The provider only turns a request into raw liveness confidence / extracted OCR
 * fields. ALL pass/fail and name-match logic lives in the pure cores around it
 * (`liveness-result.ts`, `name-match.ts`), so the provider stays thin and
 * swappable — exactly the PaymentProvider line.
 */

export interface LivenessCheckRequest {
  /** Opaque client token standing in for the captured video-selfie. */
  readonly livenessToken: string;
}

export interface LivenessCheckResult {
  /** Raw confidence 0-100 (the pure core decides pass/fail). */
  readonly confidence: number;
  readonly reference: string;
}

export interface DocumentOcrRequest {
  /** Opaque client token standing in for the uploaded diploma. */
  readonly documentToken: string;
  /** Name the student claims is on the diploma (mock OCR echoes it back). */
  readonly claimedName: string;
}

export interface DocumentOcrResult {
  readonly extractedName: string;
  readonly extractedSchool?: string;
  readonly extractedDegree?: string;
  readonly reference: string;
}

export interface IdentityVerificationProvider {
  /** Run a liveness (video-selfie) check; returns a raw confidence. */
  checkLiveness(request: LivenessCheckRequest): Promise<LivenessCheckResult>;
  /** Extract identity fields from an uploaded document via OCR. */
  extractDocument(request: DocumentOcrRequest): Promise<DocumentOcrResult>;
}

export const IDENTITY_VERIFICATION_PROVIDER = Symbol(
  'IDENTITY_VERIFICATION_PROVIDER',
);
