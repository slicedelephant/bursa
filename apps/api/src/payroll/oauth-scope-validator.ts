/**
 * E21 Payroll-HRIS — pure OAuth2 scope validator.
 *
 * Bursa must NEVER be able to write to a payroll system. When a corporate admin
 * connects an HRIS, the requested scope set is validated here: it must be
 * strictly read-only. Any write/update/admin/payroll-write scope makes the whole
 * set invalid. No I/O, no mutation — a pure boolean + reason.
 */

/** A write-ish scope substring; presence of any of these forbids the scope set. */
const WRITE_MARKERS = [
  'write',
  'update',
  'delete',
  'create',
  'admin',
  'manage',
  'modify',
] as const;

export interface ScopeValidation {
  readonly valid: boolean;
  /** The offending scopes (empty when valid). */
  readonly offending: readonly string[];
  readonly reason?: string;
}

/** True when a single scope is read-only (no write marker, and not empty). */
export function isReadOnlyScope(scope: string): boolean {
  const normalized = scope.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return !WRITE_MARKERS.some((marker) => normalized.includes(marker));
}

/**
 * Validate a requested scope set. The set is valid only when it is non-empty and
 * every scope is read-only. Returns the offending scopes for a precise error.
 */
export function validateReadOnlyScopes(
  scopes: readonly string[],
): ScopeValidation {
  if (scopes.length === 0) {
    return { valid: false, offending: [], reason: 'No scopes requested' };
  }
  const offending = scopes.filter((scope) => !isReadOnlyScope(scope));
  if (offending.length > 0) {
    return {
      valid: false,
      offending,
      reason: `Write-capable scopes are not allowed: ${offending.join(', ')}`,
    };
  }
  return { valid: true, offending: [] };
}
