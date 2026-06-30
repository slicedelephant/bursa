import { redact, REDACTED } from './pii-redact';

describe('redact', () => {
  it('masks an email inside a string', () => {
    expect(redact('contact me at jane.doe@example.com please')).toBe(
      `contact me at ${REDACTED} please`,
    );
  });

  it('masks a bearer token', () => {
    expect(redact('Authorization: Bearer abc123.def456-token')).toBe(
      `Authorization: ${REDACTED}`,
    );
  });

  it('masks a card-like number (13-19 digits, with spaces/dashes)', () => {
    expect(redact('card 4242 4242 4242 4242 used')).toBe(
      `card ${REDACTED} used`,
    );
    expect(redact('pan 4242-4242-4242-4242')).toBe(`pan ${REDACTED}`);
  });

  it('masks an IBAN', () => {
    expect(redact('iban DE89370400440532013000 ok')).toBe(
      `iban ${REDACTED} ok`,
    );
  });

  it('returns non-string primitives unchanged', () => {
    expect(redact(42)).toBe(42);
    expect(redact(true)).toBe(true);
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
  });

  it('redacts sensitive object keys regardless of value', () => {
    const out = redact({
      password: 'hunter2',
      token: 'xyz',
      passwordHash: '$2b$10$abcdef',
      keep: 'visible',
    }) as Record<string, unknown>;
    expect(out.password).toBe(REDACTED);
    expect(out.token).toBe(REDACTED);
    expect(out.passwordHash).toBe(REDACTED);
    expect(out.keep).toBe('visible');
  });

  it('redacts deeply nested structures and arrays', () => {
    const out = redact({
      user: { email: 'a@b.com', name: 'Ana' },
      notes: ['ping x@y.io', 'plain'],
    }) as { user: { email: string; name: string }; notes: string[] };
    expect(out.user.email).toBe(REDACTED);
    expect(out.user.name).toBe('Ana');
    expect(out.notes[0]).toBe(`ping ${REDACTED}`);
    expect(out.notes[1]).toBe('plain');
  });

  it('does not mutate the input object (immutable)', () => {
    const input = { email: 'a@b.com', nested: { token: 't' } };
    const snapshot = JSON.stringify(input);
    redact(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('handles cyclic references without throwing', () => {
    const a: Record<string, unknown> = { email: 'a@b.com' };
    a.self = a;
    const out = redact(a) as Record<string, unknown>;
    expect(out.email).toBe(REDACTED);
    expect(out.self).toBe(REDACTED);
  });
});
