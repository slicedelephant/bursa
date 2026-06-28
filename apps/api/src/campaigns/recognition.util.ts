import { RecognitionKind } from '@prisma/client';

/**
 * Pure derivation of the public recognition banner from a campaign's corporate
 * sponsorships — no I/O. Only non-anonymous sponsorships (LOGO or NAMED) are
 * shown; anonymous gifts stay private. Returns a new array; never mutates inputs.
 */
export interface SponsorshipForRecognition {
  readonly recognitionKind: RecognitionKind;
  readonly scholarshipName: string | null;
  readonly corporateProfile: { companyName: string; logoUrl: string | null } | null;
}

export interface RecognitionEntry {
  readonly companyName: string;
  readonly logoUrl: string | null;
  readonly scholarshipName: string | null;
}

export function toRecognition(
  sponsorships: readonly SponsorshipForRecognition[] | undefined | null,
): RecognitionEntry[] {
  if (!sponsorships) return [];
  return sponsorships
    .filter((s) => s.recognitionKind !== 'ANONYMOUS')
    .map((s) => ({
      companyName: s.corporateProfile?.companyName ?? 'A corporate sponsor',
      logoUrl: s.corporateProfile?.logoUrl ?? null,
      scholarshipName: s.scholarshipName ?? null,
    }));
}
