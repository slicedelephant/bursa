import { securityHeaders } from './security-headers';

describe('securityHeaders', () => {
  it('sets the core hardening headers', () => {
    const h = securityHeaders({ production: false });
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['Referrer-Policy']).toBe('no-referrer');
    expect(h['Permissions-Policy']).toContain('camera=()');
    expect(h['X-DNS-Prefetch-Control']).toBe('off');
  });

  it('uses a locked-down default CSP', () => {
    const h = securityHeaders({ production: false });
    expect(h['Content-Security-Policy']).toContain("default-src 'none'");
  });

  it('omits HSTS outside production', () => {
    const h = securityHeaders({ production: false });
    expect(h['Strict-Transport-Security']).toBeUndefined();
  });

  it('emits HSTS in production', () => {
    const h = securityHeaders({ production: true });
    expect(h['Strict-Transport-Security']).toContain('max-age=');
    expect(h['Strict-Transport-Security']).toContain('includeSubDomains');
  });

  it('relaxes CSP for the docs route', () => {
    const h = securityHeaders({ production: false, relaxedCsp: true });
    expect(h['Content-Security-Policy']).toContain(
      "script-src 'self' 'unsafe-inline'",
    );
  });

  it('returns a fresh object each call (no shared mutation)', () => {
    const a = securityHeaders({ production: true });
    const b = securityHeaders({ production: true });
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
