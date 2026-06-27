/**
 * Builds the set of HTTP security headers applied to every API response.
 * Pure: returns a fresh record, no side effects. Defends against OWASP
 * misconfiguration, clickjacking, MIME-sniffing and referrer leakage. HSTS is
 * only emitted in production (it would break local http) and is opt-out via
 * options for tests.
 */

export interface SecurityHeaderOptions {
  /** Emit Strict-Transport-Security (only meaningful over HTTPS). */
  production: boolean;
  /**
   * Relaxed CSP for the interactive Swagger docs route, which needs inline
   * styles/scripts. The API itself returns JSON and uses a locked-down default.
   */
  relaxedCsp?: boolean;
}

const HSTS_MAX_AGE = 63072000; // 2 years

export function securityHeaders(
  options: SecurityHeaderOptions,
): Record<string, string> {
  const csp = options.relaxedCsp
    ? "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
    : "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

  const headers: Record<string, string> = {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
    'X-DNS-Prefetch-Control': 'off',
  };

  if (options.production) {
    headers['Strict-Transport-Security'] =
      `max-age=${HSTS_MAX_AGE}; includeSubDomains; preload`;
  }

  return headers;
}
