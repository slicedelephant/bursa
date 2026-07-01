/**
 * E21 Payroll-HRIS — pure sync-/compliance-trail record builder.
 *
 * Turns a raw HRIS sync outcome into an immutable trail record that the service
 * hands to the E6 AuditService. No I/O, no mutation — just shaping the metadata a
 * compliance reviewer needs (provider, scopes, employee count, timing).
 */

export interface SyncLogInput {
  readonly provider: string;
  readonly connectionId: string;
  readonly scopes: readonly string[];
  readonly employeeCount: number;
  readonly at: Date;
}

export interface SyncLogRecord {
  readonly action: 'payroll.hris.sync';
  readonly connectionId: string;
  readonly provider: string;
  readonly scopeCount: number;
  readonly readOnly: boolean;
  readonly employeeCount: number;
  readonly syncedAt: string;
}

const WRITE_MARKERS = [
  'write',
  'update',
  'delete',
  'create',
  'admin',
  'manage',
];

/** True when every scope in the set is read-only (defence-in-depth for the trail). */
function allReadOnly(scopes: readonly string[]): boolean {
  return scopes.every(
    (s) => !WRITE_MARKERS.some((m) => s.toLowerCase().includes(m)),
  );
}

/** Build the immutable sync-trail record. `employeeCount` is clamped to >= 0. */
export function buildSyncLog(input: SyncLogInput): SyncLogRecord {
  return {
    action: 'payroll.hris.sync',
    connectionId: input.connectionId,
    provider: input.provider,
    scopeCount: input.scopes.length,
    readOnly: allReadOnly(input.scopes),
    employeeCount: Math.max(0, Math.floor(input.employeeCount)),
    syncedAt: input.at.toISOString(),
  };
}
