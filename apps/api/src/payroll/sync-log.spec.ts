import { buildSyncLog } from './sync-log';

describe('buildSyncLog', () => {
  const at = new Date('2026-06-29T10:00:00.000Z');

  it('builds a read-only sync record', () => {
    const r = buildSyncLog({
      provider: 'ADP',
      connectionId: 'conn_1',
      scopes: ['employees.read', 'payroll.read'],
      employeeCount: 42,
      at,
    });
    expect(r.action).toBe('payroll.hris.sync');
    expect(r.provider).toBe('ADP');
    expect(r.scopeCount).toBe(2);
    expect(r.readOnly).toBe(true);
    expect(r.employeeCount).toBe(42);
    expect(r.syncedAt).toBe(at.toISOString());
  });

  it('flags a non-read-only scope set', () => {
    const r = buildSyncLog({
      provider: 'ADP',
      connectionId: 'conn_1',
      scopes: ['employees.read', 'payroll.write'],
      employeeCount: 1,
      at,
    });
    expect(r.readOnly).toBe(false);
  });

  it('clamps a negative employee count to 0', () => {
    const r = buildSyncLog({
      provider: 'MOCK',
      connectionId: 'conn_1',
      scopes: ['employees.read'],
      employeeCount: -5,
      at,
    });
    expect(r.employeeCount).toBe(0);
  });
});
