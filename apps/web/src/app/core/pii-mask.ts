// Pure PII masking for display. Used to show "this is your data" without
// printing the full address/identifier in the UI. No I/O.

/**
 * Masks an email for display: keeps the first character and the domain,
 * replaces the rest of the local part with dots. `jane@example.com` →
 * `j••@example.com`. Returns the input unchanged if it is not an email.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 1) return `${local}${'•'.repeat(2)}${domain}`;
  return `${local[0]}${'•'.repeat(Math.min(local.length - 1, 4))}${domain}`;
}
