import { assessPassword, validateStrongPassword } from './password-policy';

describe('assessPassword', () => {
  it('accepts a strong password', () => {
    const r = assessPassword('Tr0ubadour-Xy!');
    expect(r.valid).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.score).toBeGreaterThanOrEqual(3);
    expect(r.label).toMatch(/good|strong/);
  });

  it('rejects a too-short password', () => {
    const r = assessPassword('Ab1cd');
    expect(r.valid).toBe(false);
    expect(r.issues.join(' ')).toContain('at least 10');
  });

  it('flags a missing uppercase letter', () => {
    const r = assessPassword('lowercase123');
    expect(r.valid).toBe(false);
    expect(r.issues.join(' ')).toContain('uppercase');
  });

  it('flags a missing number', () => {
    const r = assessPassword('NoNumbersHere');
    expect(r.valid).toBe(false);
    expect(r.issues.join(' ')).toContain('number');
  });

  it('flags a missing lowercase letter', () => {
    const r = assessPassword('ALLUPPER1234');
    expect(r.valid).toBe(false);
    expect(r.issues.join(' ')).toContain('lowercase');
  });

  it('rejects a common password', () => {
    const r = assessPassword('password1');
    expect(r.valid).toBe(false);
    expect(r.issues.join(' ')).toContain('too common');
  });

  it('rejects repeated characters', () => {
    const r = assessPassword('aaaaaaaaaaA1');
    expect(r.issues.join(' ')).toContain('sequential or repeated');
  });

  it('caps an invalid password score at 1', () => {
    expect(assessPassword('short').score).toBeLessThanOrEqual(1);
  });

  it('labels an empty password very weak', () => {
    const r = assessPassword('');
    expect(r.label).toBe('very weak');
    expect(r.valid).toBe(false);
  });
});

describe('validateStrongPassword', () => {
  it('does not throw for a strong password', () => {
    expect(() => validateStrongPassword('Tr0ubadour-Xy!')).not.toThrow();
  });

  it('throws a VALIDATION_ERROR for a weak password', () => {
    expect(() => validateStrongPassword('weak')).toThrow();
  });
});
