/**
 * The single seam between school onboarding and any e-signature service (E8).
 * The prototype ships MockEsignatureProvider; a real provider (DocuSign, Scrive,
 * …) must implement this same interface with zero domain changes. No real
 * DocuSign call is made anywhere in the prototype.
 */
export interface SignAgreementInput {
  readonly schoolId: string;
  readonly schoolName: string;
  readonly signerName: string;
  readonly documentTitle?: string;
}

export interface SignedAgreement {
  readonly provider: string;
  readonly agreementRef: string;
  readonly signerName: string;
  readonly signedAt: Date;
}

export interface EsignatureProvider {
  signAgreement(input: SignAgreementInput): Promise<SignedAgreement>;
}

export const ESIGNATURE_PROVIDER = Symbol('ESIGNATURE_PROVIDER');
