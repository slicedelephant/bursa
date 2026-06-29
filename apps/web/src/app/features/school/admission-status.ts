// Pure presentation helpers for admission records + CSV import results (E8).
// No Angular, no I/O; returns new values, never mutates.

export type AdmissionStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

const LABELS: Record<AdmissionStatus, string> = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export function admissionStatusLabel(status: AdmissionStatus): string {
  return LABELS[status] ?? 'Unknown';
}

export function admissionStatusClass(status: AdmissionStatus): string {
  switch (status) {
    case 'VERIFIED':
      return 'bg-brand-green/10 text-brand-green ring-brand-green/30';
    case 'REJECTED':
      return 'bg-brand-orange/10 text-brand-orange ring-brand-orange/30';
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-300';
  }
}

export interface ImportResultLike {
  readonly imported: number;
  readonly duplicates: number;
  readonly errors: readonly { line: number; message: string }[];
}

/** A short, human summary of an import outcome for a toast/banner. */
export function importSummary(result: ImportResultLike): string {
  const parts = [`${result.imported} imported`];
  if (result.duplicates > 0) parts.push(`${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'} skipped`);
  if (result.errors.length > 0) parts.push(`${result.errors.length} row error${result.errors.length === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export function hasImportProblems(result: ImportResultLike): boolean {
  return result.duplicates > 0 || result.errors.length > 0;
}
