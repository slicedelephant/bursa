import { generateTotp, verifyTotp } from './totp';

const SECRET = 'super-secret-totp-key';

describe('TOTP', () => {
  it('generates a 6-digit code', () => {
    const code = generateTotp(SECRET, 1_700_000_000);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('verifies a freshly generated code', () => {
    const now = 1_700_000_000;
    const code = generateTotp(SECRET, now);
    expect(verifyTotp(SECRET, code, now)).toBe(true);
  });

  it('accepts a code from the previous step (drift window)', () => {
    const now = 1_700_000_000;
    const earlier = generateTotp(SECRET, now - 30);
    expect(verifyTotp(SECRET, earlier, now, 1)).toBe(true);
  });

  it('rejects a code outside the drift window', () => {
    const now = 1_700_000_000;
    const old = generateTotp(SECRET, now - 120);
    expect(verifyTotp(SECRET, old, now, 1)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const now = 1_700_000_000;
    const code = generateTotp(SECRET, now);
    expect(verifyTotp('other-secret', code, now)).toBe(false);
  });

  it('rejects malformed tokens', () => {
    const now = 1_700_000_000;
    expect(verifyTotp(SECRET, '12345', now)).toBe(false);
    expect(verifyTotp(SECRET, 'abcdef', now)).toBe(false);
    expect(verifyTotp(SECRET, '', now)).toBe(false);
  });

  it('rejects when secret is empty', () => {
    expect(verifyTotp('', '123456', 1_700_000_000)).toBe(false);
  });
});
