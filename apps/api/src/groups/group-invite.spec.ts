import {
  GroupInviteRecord,
  createGroupInvite,
  decideInviteAcceptance,
} from './group-invite';

const fixedBytes = () => Buffer.from('0123456789abcdef0123456789abcdef', 'hex');

function makeInvite(overrides: Partial<GroupInviteRecord> = {}) {
  const created = createGroupInvite('CONTRIBUTOR', { bytes: fixedBytes });
  const record: GroupInviteRecord = {
    codeHash: created.codeHash,
    status: 'ACTIVE',
    role: created.role,
    expiresAt: null,
    ...overrides,
  };
  return { created, record };
}

describe('createGroupInvite', () => {
  it('produces a raw code + hash + role via the E15 pattern', () => {
    const invite = createGroupInvite('ADMIN', { bytes: fixedBytes });
    expect(invite.role).toBe('ADMIN');
    expect(invite.code).toHaveLength(32); // 16 bytes hex
    expect(invite.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(invite.expiresAt).toBeNull();
  });

  it('carries an expiry when provided', () => {
    const expiresAt = new Date('2026-07-15T00:00:00.000Z');
    const invite = createGroupInvite('VIEWER', {
      bytes: fixedBytes,
      expiresAt,
    });
    expect(invite.expiresAt).toEqual(expiresAt);
  });
});

describe('decideInviteAcceptance', () => {
  const now = new Date('2026-07-01T00:00:00.000Z');

  it('accepts a valid, active, non-expired token for a new member', () => {
    const { created, record } = makeInvite();
    const result = decideInviteAcceptance({
      record,
      rawCode: created.code,
      now,
      alreadyMember: false,
    });
    expect(result).toEqual({ accept: true, role: 'CONTRIBUTOR' });
  });

  it('rejects a missing record as malformed', () => {
    const result = decideInviteAcceptance({
      record: null,
      rawCode: 'anything',
      now,
      alreadyMember: false,
    });
    expect(result).toEqual({ accept: false, reason: 'malformed' });
  });

  it('rejects a wrong token as mismatch', () => {
    const { record } = makeInvite();
    const result = decideInviteAcceptance({
      record,
      rawCode: 'deadbeef',
      now,
      alreadyMember: false,
    });
    expect(result).toEqual({ accept: false, reason: 'mismatch' });
  });

  it('rejects a revoked invite', () => {
    const { created, record } = makeInvite({ status: 'REVOKED' });
    const result = decideInviteAcceptance({
      record,
      rawCode: created.code,
      now,
      alreadyMember: false,
    });
    expect(result).toEqual({ accept: false, reason: 'revoked' });
  });

  it('rejects a used invite', () => {
    const { created, record } = makeInvite({ status: 'USED' });
    const result = decideInviteAcceptance({
      record,
      rawCode: created.code,
      now,
      alreadyMember: false,
    });
    expect(result).toEqual({ accept: false, reason: 'used' });
  });

  it('rejects an expired invite (now >= expiresAt)', () => {
    const { created, record } = makeInvite({
      expiresAt: new Date('2026-06-30T00:00:00.000Z'),
    });
    const result = decideInviteAcceptance({
      record,
      rawCode: created.code,
      now,
      alreadyMember: false,
    });
    expect(result).toEqual({ accept: false, reason: 'expired' });
  });

  it('accepts an invite that expires in the future', () => {
    const { created, record } = makeInvite({
      expiresAt: new Date('2026-07-15T00:00:00.000Z'),
    });
    const result = decideInviteAcceptance({
      record,
      rawCode: created.code,
      now,
      alreadyMember: false,
    });
    expect(result.accept).toBe(true);
  });

  it('accepts an expiry provided as an ISO string', () => {
    const { created, record } = makeInvite({
      expiresAt: '2026-07-15T00:00:00.000Z',
    });
    const result = decideInviteAcceptance({
      record,
      rawCode: created.code,
      now,
      alreadyMember: false,
    });
    expect(result.accept).toBe(true);
  });

  it('rejects when the user is already a member', () => {
    const { created, record } = makeInvite();
    const result = decideInviteAcceptance({
      record,
      rawCode: created.code,
      now,
      alreadyMember: true,
    });
    expect(result).toEqual({ accept: false, reason: 'already_member' });
  });
});
