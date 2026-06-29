/**
 * E9 Trust-and-Safety — pure sanction / suspicious-keyword / duplicate matcher.
 *
 * The sanctioned-country set is a small STATIC list (ISO-3166 alpha-2) — NOT a
 * live OFAC/sanctions feed (see spec Out-of-Scope; a real provider is a later
 * swap of `isSanctionedCountry`). Suspicious-keyword and duplicate detection use
 * simple, deterministic string heuristics. No I/O, no mutation.
 */

/** Static, illustrative sanctioned-country list (ISO alpha-2). */
export const SANCTIONED_COUNTRIES: readonly string[] = [
  'IR', // Iran
  'KP', // North Korea
  'SY', // Syria
  'CU', // Cuba
  'RU', // Russia
  'BY', // Belarus
  'VE', // Venezuela
  'MM', // Myanmar
];

/** A handful of common scam / money-laundering trigger phrases (lower-case). */
export const SUSPICIOUS_KEYWORDS: readonly string[] = [
  'guaranteed return',
  'double your money',
  'crypto investment',
  'bitcoin',
  'wire transfer',
  'western union',
  'gift card',
  'lottery winner',
  'nigerian prince',
  'cash app only',
  'investment opportunity',
  'act now',
];

const DUPLICATE_STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'for',
  'to',
  'of',
  'my',
  'i',
  'is',
  'in',
  'on',
  'at',
]);

/** Lower-cases, strips punctuation and collapses whitespace. */
export function normalizeText(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True if `country` (ISO alpha-2, any case/whitespace) is on the static list. */
export function isSanctionedCountry(country?: string | null): boolean {
  if (!country) return false;
  const code = country.trim().toUpperCase();
  return SANCTIONED_COUNTRIES.includes(code);
}

export interface KeywordMatch {
  readonly matched: string[];
  readonly count: number;
}

/** Returns the suspicious keywords found as substrings of `text`. */
export function matchSuspiciousKeywords(text?: string | null): KeywordMatch {
  const haystack = normalizeText(text);
  if (!haystack) return { matched: [], count: 0 };
  const matched = SUSPICIOUS_KEYWORDS.filter((kw) =>
    haystack.includes(normalizeText(kw)),
  );
  return { matched, count: matched.length };
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(' ')
      .filter((t) => t.length > 1 && !DUPLICATE_STOPWORDS.has(t)),
  );
}

/**
 * Jaccard similarity (0..1) of the significant tokens of two campaign texts.
 * Used to spot near-duplicate campaigns; 1 = identical token sets, 0 = disjoint.
 */
export function duplicateScore(a?: string | null, b?: string | null): number {
  const setA = tokenSet(a ?? '');
  const setB = tokenSet(b ?? '');
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
