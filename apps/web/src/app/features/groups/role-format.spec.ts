import { canContribute, canManage, roleLabel, rolePermission } from './role-format';

describe('role-format', () => {
  it('labels each role', () => {
    expect(roleLabel('ADMIN')).toBe('Admin');
    expect(roleLabel('CONTRIBUTOR')).toBe('Contributor');
    expect(roleLabel('VIEWER')).toBe('Viewer');
  });

  it('describes each role permission', () => {
    expect(rolePermission('ADMIN')).toContain('Manages');
    expect(rolePermission('CONTRIBUTOR')).toContain('Contributes');
    expect(rolePermission('VIEWER')).toBe('Reads only');
  });

  it('gates management to admins', () => {
    expect(canManage('ADMIN')).toBe(true);
    expect(canManage('CONTRIBUTOR')).toBe(false);
    expect(canManage(null)).toBe(false);
  });

  it('gates contribution to admins and contributors', () => {
    expect(canContribute('ADMIN')).toBe(true);
    expect(canContribute('CONTRIBUTOR')).toBe(true);
    expect(canContribute('VIEWER')).toBe(false);
    expect(canContribute(null)).toBe(false);
  });
});
