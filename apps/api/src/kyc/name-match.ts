/**
 * E11 KYC — pure fuzzy name matcher.
 *
 * Compares the name extracted from a diploma (mock OCR) against the name on the
 * E8 admission record. Small spelling differences (a typo, an accent dropped)
 * should still match; a genuinely different name should not. Uses normalized
 * Levenshtein similarity — deterministic, no I/O, no mutation, no ML model
 * (see spec Out-of-Scope). All testable logic lives here.
 */

/** Minimum similarity (0-100, inclusive) for two names to count as a match. */
export const NAME_MATCH_MIN_SCORE = 80;

export interface NameMatch {
  readonly score: number;
  readonly matched: boolean;
}

/** Lower-cases, strips punctuation/diacritics and collapses whitespace. */
export function normalizeName(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Classic Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i += 1) {
    const current = [i + 1];
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      current.push(
        Math.min(
          current[j] + 1, // insertion
          previous[j + 1] + 1, // deletion
          previous[j] + cost, // substitution
        ),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Similarity score (0-100) of two names after normalization. Identical names
 * score 100; two empty/blank names are treated as a non-match (score 0) so a
 * missing name never auto-passes.
 */
export function nameSimilarity(a?: string | null, b?: string | null): number {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (left.length === 0 || right.length === 0) return 0;
  if (left === right) return 100;
  const distance = levenshtein(left, right);
  const maxLen = Math.max(left.length, right.length);
  const similarity = (1 - distance / maxLen) * 100;
  return Math.max(0, Math.round(similarity));
}

/** Score two names and derive a match flag against `NAME_MATCH_MIN_SCORE`. */
export function matchName(a?: string | null, b?: string | null): NameMatch {
  const score = nameSimilarity(a, b);
  return { score, matched: score >= NAME_MATCH_MIN_SCORE };
}
