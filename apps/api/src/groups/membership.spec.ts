import {
  MIN_COHORT_MEMBERS,
  MemberState,
  canContribute,
  canManage,
  canVote,
  cohortActive,
  decideJoin,
  decideLeave,
  decideRoleChange,
} from './membership';

const members: MemberState[] = [
  { userId: 'u_admin', role: 'ADMIN' },
  { userId: 'u_contrib', role: 'CONTRIBUTOR' },
  { userId: 'u_viewer', role: 'VIEWER' },
];

describe('membership permissions', () => {
  it('canManage only for ADMIN', () => {
    expect(canManage('ADMIN')).toBe(true);
    expect(canManage('CONTRIBUTOR')).toBe(false);
    expect(canManage('VIEWER')).toBe(false);
  });

  it('canContribute for ADMIN + CONTRIBUTOR', () => {
    expect(canContribute('ADMIN')).toBe(true);
    expect(canContribute('CONTRIBUTOR')).toBe(true);
    expect(canContribute('VIEWER')).toBe(false);
  });

  it('canVote for ADMIN + CONTRIBUTOR', () => {
    expect(canVote('ADMIN')).toBe(true);
    expect(canVote('CONTRIBUTOR')).toBe(true);
    expect(canVote('VIEWER')).toBe(false);
  });
});

describe('cohortActive', () => {
  it('needs the member floor', () => {
    expect(cohortActive(MIN_COHORT_MEMBERS - 1)).toBe(false);
    expect(cohortActive(MIN_COHORT_MEMBERS)).toBe(true);
    expect(cohortActive(MIN_COHORT_MEMBERS + 5)).toBe(true);
  });
});

describe('decideJoin', () => {
  it('allows a new user with the invite role', () => {
    expect(decideJoin(members, 'u_new', 'CONTRIBUTOR')).toEqual({
      allow: true,
      nextRole: 'CONTRIBUTOR',
    });
  });

  it('blocks a user who is already a member', () => {
    expect(decideJoin(members, 'u_admin', 'VIEWER')).toEqual({
      allow: false,
      reason: 'ALREADY_MEMBER',
    });
  });
});

describe('decideLeave', () => {
  it('allows a non-admin member to leave', () => {
    expect(decideLeave(members, 'u_contrib')).toEqual({ allow: true });
  });

  it('allows an admin to leave when another admin remains', () => {
    const two: MemberState[] = [
      { userId: 'a1', role: 'ADMIN' },
      { userId: 'a2', role: 'ADMIN' },
    ];
    expect(decideLeave(two, 'a1')).toEqual({ allow: true });
  });

  it('blocks the last admin from leaving', () => {
    expect(decideLeave(members, 'u_admin')).toEqual({
      allow: false,
      reason: 'LAST_ADMIN',
    });
  });

  it('blocks a non-member', () => {
    expect(decideLeave(members, 'ghost')).toEqual({
      allow: false,
      reason: 'NOT_A_MEMBER',
    });
  });
});

describe('decideRoleChange', () => {
  it('lets an admin promote a contributor', () => {
    expect(decideRoleChange(members, 'ADMIN', 'u_contrib', 'ADMIN')).toEqual({
      allow: true,
      nextRole: 'ADMIN',
    });
  });

  it('refuses a non-admin actor', () => {
    expect(
      decideRoleChange(members, 'CONTRIBUTOR', 'u_viewer', 'CONTRIBUTOR'),
    ).toEqual({ allow: false, reason: 'FORBIDDEN' });
  });

  it('refuses changing a role of a non-member', () => {
    expect(decideRoleChange(members, 'ADMIN', 'ghost', 'ADMIN')).toEqual({
      allow: false,
      reason: 'NOT_A_MEMBER',
    });
  });

  it('blocks demoting the last admin', () => {
    expect(
      decideRoleChange(members, 'ADMIN', 'u_admin', 'CONTRIBUTOR'),
    ).toEqual({ allow: false, reason: 'LAST_ADMIN' });
  });

  it('allows demoting an admin when another admin remains', () => {
    const two: MemberState[] = [
      { userId: 'a1', role: 'ADMIN' },
      { userId: 'a2', role: 'ADMIN' },
    ];
    expect(decideRoleChange(two, 'ADMIN', 'a1', 'VIEWER')).toEqual({
      allow: true,
      nextRole: 'VIEWER',
    });
  });

  it('allows keeping the last admin as admin (no-op role set)', () => {
    expect(decideRoleChange(members, 'ADMIN', 'u_admin', 'ADMIN')).toEqual({
      allow: true,
      nextRole: 'ADMIN',
    });
  });
});
