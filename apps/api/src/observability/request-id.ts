/**
 * Correlation-ID helpers. Pure and immutable: a request either carries a valid
 * `x-request-id` (which we reuse so a client/proxy can correlate end-to-end) or
 * we mint a fresh one. The id is intentionally opaque and PII-free.
 */

const VALID = /^[A-Za-z0-9_-]{8,64}$/;

/** True when the value is a safe, bounded correlation id (no PII, no spoofy chars). */
export function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && VALID.test(value);
}

/** Generates a fresh, opaque request id (prefix `req_`, no PII). */
export function generateRequestId(
  rand: () => number = Math.random,
  now: () => number = Date.now,
): string {
  const a = Math.floor(rand() * 1e9).toString(36);
  const b = now().toString(36);
  return `req_${b}${a}`.slice(0, 40);
}

/**
 * Resolves the correlation id for a request: reuse an incoming valid header,
 * otherwise generate one. Header value may be `string | string[] | undefined`.
 */
export function resolveRequestId(
  headerValue: unknown,
  generate: () => string = generateRequestId,
): string {
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return isValidRequestId(candidate) ? candidate : generate();
}
