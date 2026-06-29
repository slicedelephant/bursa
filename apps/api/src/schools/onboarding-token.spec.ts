import {
  createOnboardingToken,
  hashToken,
  validateOnboardingToken,
} from './onboarding-token';

const fixedBytes = () => Buffer.from('a'.repeat(64), 'hex'); // 32 deterministic bytes

describe('onboarding-token', () => {
  it('creates a token whose hash matches and never returns the raw token as the hash', () => {
    const now = new Date('2026-06-29T00:00:00.000Z');
    const created = createOnboardingToken({ now, bytes: fixedBytes });
    expect(created.token).toBe('a'.repeat(64));
    expect(created.tokenHash).toBe(hashToken(created.token));
    expect(created.tokenHash).not.toBe(created.token);
    expect(created.expiresAt.getTime()).toBe(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  });

  it('honours a custom ttl', () => {
    const now = new Date('2026-06-29T00:00:00.000Z');
    const created = createOnboardingToken({ now, ttlMs: 1000, bytes: fixedBytes });
    expect(created.expiresAt.getTime()).toBe(now.getTime() + 1000);
  });

  it('validates a fresh, unused, matching token', () => {
    const now = new Date('2026-06-29T00:00:00.000Z');
    const created = createOnboardingToken({ now, bytes: fixedBytes });
    const result = validateOnboardingToken(
      { tokenHash: created.tokenHash, expiresAt: created.expiresAt, usedAt: null },
      created.token,
      now,
    );
    expect(result).toEqual({ valid: true });
  });

  it('rejects a missing record or empty token as malformed', () => {
    expect(validateOnboardingToken(null, 'x').reason).toBe('malformed');
    expect(
      validateOnboardingToken(
        { tokenHash: 'deadbeef', expiresAt: new Date() },
        '',
      ).reason,
    ).toBe('malformed');
  });

  it('rejects a non-matching token', () => {
    const created = createOnboardingToken({ bytes: fixedBytes });
    const result = validateOnboardingToken(
      { tokenHash: created.tokenHash, expiresAt: new Date(Date.now() + 1000) },
      'b'.repeat(64),
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('mismatch');
  });

  it('rejects an already-used token', () => {
    const now = new Date('2026-06-29T00:00:00.000Z');
    const created = createOnboardingToken({ now, bytes: fixedBytes });
    const result = validateOnboardingToken(
      {
        tokenHash: created.tokenHash,
        expiresAt: created.expiresAt,
        usedAt: new Date('2026-06-29T01:00:00.000Z'),
      },
      created.token,
      now,
    );
    expect(result).toEqual({ valid: false, reason: 'used' });
  });

  it('rejects an expired token', () => {
    const created = createOnboardingToken({
      now: new Date('2026-06-01T00:00:00.000Z'),
      ttlMs: 1000,
      bytes: fixedBytes,
    });
    const result = validateOnboardingToken(
      { tokenHash: created.tokenHash, expiresAt: created.expiresAt, usedAt: null },
      created.token,
      new Date('2026-06-29T00:00:00.000Z'),
    );
    expect(result).toEqual({ valid: false, reason: 'expired' });
  });
});
