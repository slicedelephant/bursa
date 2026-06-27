import { maskEmail } from './pii-mask';

describe('maskEmail', () => {
  it('keeps the first local char and the domain', () => {
    expect(maskEmail('jane@example.com')).toBe('j•••@example.com');
  });

  it('handles a single-char local part', () => {
    expect(maskEmail('a@b.com')).toBe('a••@b.com');
  });

  it('caps the dots at four', () => {
    expect(maskEmail('verylonglocalpart@x.io')).toBe('v••••@x.io');
  });

  it('returns empty for nullish input', () => {
    expect(maskEmail(null)).toBe('');
    expect(maskEmail(undefined)).toBe('');
    expect(maskEmail('')).toBe('');
  });

  it('returns non-emails unchanged', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email');
    expect(maskEmail('@nolocal.com')).toBe('@nolocal.com');
  });
});
