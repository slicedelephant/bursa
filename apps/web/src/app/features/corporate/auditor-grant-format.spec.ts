import { AuditorGrant } from '../../core/models';
import {
  canRevoke,
  hoursUntilExpiry,
  portalUrl,
  statusChipClass,
  statusLabel,
} from './auditor-grant-format';

const grant = (over: Partial<AuditorGrant> = {}): AuditorGrant => ({
  id: 'g1',
  label: 'PwC',
  expiresAt: '2026-07-02T12:00:00Z',
  revokedAt: null,
  lastUsedAt: null,
  status: 'ACTIVE',
  ...over,
});

describe('auditor-grant-format', () => {
  it('labels statuses', () => {
    expect(statusLabel('ACTIVE')).toBe('Active');
    expect(statusLabel('EXPIRED')).toBe('Expired');
    expect(statusLabel('REVOKED')).toBe('Revoked');
  });

  it('chip classes differ per status', () => {
    expect(statusChipClass('ACTIVE')).toContain('emerald');
    expect(statusChipClass('EXPIRED')).toContain('slate');
    expect(statusChipClass('REVOKED')).toContain('brand-orange');
  });

  it('allows revoke only for active grants', () => {
    expect(canRevoke(grant({ status: 'ACTIVE' }))).toBe(true);
    expect(canRevoke(grant({ status: 'EXPIRED' }))).toBe(false);
    expect(canRevoke(grant({ status: 'REVOKED' }))).toBe(false);
  });

  it('computes hours until expiry, flooring at 0', () => {
    const now = new Date('2026-06-30T12:00:00Z');
    expect(hoursUntilExpiry('2026-07-02T12:00:00Z', now)).toBe(48);
    expect(hoursUntilExpiry('2026-06-29T12:00:00Z', now)).toBe(0);
  });

  it('builds a portal URL', () => {
    expect(portalUrl('abc123')).toBe('/audit-portal/abc123');
    expect(portalUrl('abc123', 'https://bursa.org')).toBe('https://bursa.org/audit-portal/abc123');
  });
});
