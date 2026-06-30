import { AuditorGrant, AuditorGrantStatus } from '../../core/models';

/**
 * Pure presentation helpers for the auditor-access panel. No I/O; returns new
 * values, never mutates inputs.
 */

const STATUS_LABELS: Record<AuditorGrantStatus, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

export function statusLabel(status: AuditorGrantStatus): string {
  return STATUS_LABELS[status];
}

/** Tailwind chip classes for a grant status. */
export function statusChipClass(status: AuditorGrantStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-700';
    case 'EXPIRED':
      return 'bg-slate-100 text-slate2';
    case 'REVOKED':
      return 'bg-brand-orange/10 text-brand-orange';
  }
}

/** Whether a grant can still be revoked (only an active one). */
export function canRevoke(grant: AuditorGrant): boolean {
  return grant.status === 'ACTIVE';
}

/** Hours remaining until expiry (0 when already past), relative to `now`. */
export function hoursUntilExpiry(expiresAt: string, now: Date = new Date()): number {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / (60 * 60 * 1000));
}

/** Absolute portal URL for a raw token (for copy-to-clipboard). */
export function portalUrl(token: string, origin = ''): string {
  return `${origin}/audit-portal/${token}`;
}
