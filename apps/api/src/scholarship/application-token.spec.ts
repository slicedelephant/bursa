import {
  createApplicationToken,
  hashToken,
  isTokenActive,
  tokenMatches,
} from './application-token';

describe('hashToken', () => {
  it('is stable for the same input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('differs for different inputs', () => {
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});

describe('createApplicationToken', () => {
  it('returns a raw token whose hash matches', () => {
    const created = createApplicationToken(() => Buffer.from('0102030405060708', 'hex'));
    expect(created.tokenHash).toBe(hashToken(created.token));
    expect(created.token).toBe('0102030405060708');
  });
});

describe('isTokenActive', () => {
  const NOW = new Date('2026-06-15T00:00:00.000Z');

  it('is active with no expiry and no revocation', () => {
    expect(isTokenActive({ tokenHash: 'x' }, NOW)).toBe(true);
  });

  it('is inactive when revoked', () => {
    expect(isTokenActive({ tokenHash: 'x', revokedAt: NOW }, NOW)).toBe(false);
  });

  it('is inactive when expired', () => {
    const past = new Date('2026-06-14T00:00:00.000Z');
    expect(isTokenActive({ tokenHash: 'x', expiresAt: past }, NOW)).toBe(false);
  });

  it('is active when expiry is in the future', () => {
    const future = new Date('2026-07-01T00:00:00.000Z');
    expect(isTokenActive({ tokenHash: 'x', expiresAt: future }, NOW)).toBe(true);
  });
});

describe('tokenMatches', () => {
  it('matches a raw token to its own hash', () => {
    const created = createApplicationToken(() => Buffer.from('aabbccdd', 'hex'));
    expect(tokenMatches(created.token, created.tokenHash)).toBe(true);
  });

  it('rejects a wrong token', () => {
    const created = createApplicationToken(() => Buffer.from('aabbccdd', 'hex'));
    expect(tokenMatches('deadbeef', created.tokenHash)).toBe(false);
  });

  it('rejects an empty token', () => {
    expect(tokenMatches('', hashToken('x'))).toBe(false);
  });
});
