import {
  isReadOnlyScope,
  validateReadOnlyScopes,
} from './oauth-scope-validator';

describe('isReadOnlyScope', () => {
  it('accepts a read scope', () => {
    expect(isReadOnlyScope('employees.read')).toBe(true);
    expect(isReadOnlyScope('payroll.read')).toBe(true);
  });

  it('rejects a write/update/admin scope', () => {
    expect(isReadOnlyScope('payroll.write')).toBe(false);
    expect(isReadOnlyScope('employees.update')).toBe(false);
    expect(isReadOnlyScope('org.admin')).toBe(false);
    expect(isReadOnlyScope('employees.manage')).toBe(false);
  });

  it('rejects an empty/whitespace scope', () => {
    expect(isReadOnlyScope('')).toBe(false);
    expect(isReadOnlyScope('   ')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isReadOnlyScope('Payroll.WRITE')).toBe(false);
    expect(isReadOnlyScope('Employees.Read')).toBe(true);
  });
});

describe('validateReadOnlyScopes', () => {
  it('accepts an all-read set', () => {
    const r = validateReadOnlyScopes(['employees.read', 'payroll.read']);
    expect(r.valid).toBe(true);
    expect(r.offending).toEqual([]);
  });

  it('rejects an empty set', () => {
    const r = validateReadOnlyScopes([]);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('No scopes');
  });

  it('rejects a set containing a write scope and lists the offender', () => {
    const r = validateReadOnlyScopes(['employees.read', 'payroll.write']);
    expect(r.valid).toBe(false);
    expect(r.offending).toEqual(['payroll.write']);
    expect(r.reason).toContain('payroll.write');
  });

  it('lists all offenders', () => {
    const r = validateReadOnlyScopes(['payroll.write', 'employees.delete']);
    expect(r.offending).toEqual(['payroll.write', 'employees.delete']);
  });
});
