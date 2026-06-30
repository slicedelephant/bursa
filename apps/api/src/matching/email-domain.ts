/**
 * E13 Employer-Matching — pure email-domain extractor.
 *
 * The donor enters a work email; this pure core normalises it to a registrable
 * domain we can look up against the employer DB. No I/O, no mutation — fully
 * deterministic and unit-testable.
 */

/**
 * Extract and normalise the domain from a work email. Returns a lowercase,
 * trimmed domain (the part after the last `@`), or null when the input has no
 * usable `@domain` part. A leading `mailto:` and surrounding whitespace are
 * stripped; an empty domain or one without a dot is rejected.
 */
export function extractDomain(
  rawEmail: string | null | undefined,
): string | null {
  if (typeof rawEmail !== 'string') return null;

  const cleaned = rawEmail
    .trim()
    .replace(/^mailto:/i, '')
    .toLowerCase();
  const atIndex = cleaned.lastIndexOf('@');
  if (atIndex < 0) return null;

  const domain = cleaned.slice(atIndex + 1);
  if (domain.length === 0 || !domain.includes('.')) return null;
  // A domain must not contain whitespace or a stray '@' (malformed input).
  if (/[\s@]/.test(domain)) return null;

  return domain;
}
