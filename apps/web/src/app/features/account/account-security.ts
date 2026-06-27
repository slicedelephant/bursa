// Pure helpers for the GDPR data export. The DOM download (Blob + anchor) lives
// in the page; these string helpers are unit-tested in isolation.

/** A date-stamped filename for the export download. */
export function exportFilename(now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return `bursa-data-export-${iso}.json`;
}

/** Pretty-prints the export payload as JSON for the download blob. */
export function exportJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/** Confirmation copy for the irreversible account-deletion action. */
export const DELETE_CONFIRM_TEXT =
  'This permanently anonymises your account: your name and email are removed and you can no longer sign in. Your past donations stay recorded (without your personal data) so the money trail to the school remains auditable. Continue?';
