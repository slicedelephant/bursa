/**
 * PII redaction for logs. Pure and immutable: never mutates the input, always
 * returns a fresh value with emails, tokens, card-like numbers, IBANs and
 * known-sensitive object keys replaced by a stable placeholder. Used by the
 * global exception filter and the audit service so a log leak can never expose
 * personal data, credentials or card data (GDPR / PCI).
 */

export const REDACTED = '[redacted]';

/** Object keys whose value is always sensitive, whatever it contains. */
const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'apikey',
  'cvc',
  'cvv',
  'cardnumber',
  'pan',
];

const PATTERNS: RegExp[] = [
  // Bearer / token headers
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  // Email addresses
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  // IBAN (2 letters, 2 digits, up to 30 alnum)
  /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g,
  // Card-like number: 13-19 digits, optionally grouped by spaces or dashes.
  // Anchored to end on a digit so a trailing separator is not swallowed.
  /\b\d(?:[ -]?\d){12,18}\b/g,
];

/** Redacts PII patterns inside a plain string. */
function redactString(value: string): string {
  return PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, REDACTED),
    value,
  );
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.includes(key.toLowerCase());
}

/**
 * Deep-redacts any value. Returns a new structure; the input is never mutated.
 * Cyclic references are collapsed to the placeholder to stay safe in logs.
 */
export function redact(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;

  if (seen.has(value as object)) return REDACTED;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }

  const source = value as Record<string, unknown>;
  return Object.keys(source).reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = isSensitiveKey(key) ? REDACTED : redact(source[key], seen);
    return acc;
  }, {});
}
