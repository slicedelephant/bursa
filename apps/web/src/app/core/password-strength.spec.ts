import { assessPasswordStrength } from './password-strength';

describe('assessPasswordStrength', () => {
  it('rates a strong password as valid with a high score', () => {
    const r = assessPasswordStrength('Tr0ubadour-Xy!');
    expect(r.valid).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.score).toBeGreaterThanOrEqual(3);
    expect(r.label).toMatch(/good|strong/);
    expect(r.widthPercent).toBe('100%');
  });

  it('flags a short password', () => {
    const r = assessPasswordStrength('Ab1cd');
    expect(r.valid).toBe(false);
    expect(r.issues.join(' ')).toContain('at least 10');
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it('flags missing character classes', () => {
    expect(assessPasswordStrength('lowercase123').issues.join(' ')).toContain('uppercase');
    expect(assessPasswordStrength('NoNumbersHere').issues.join(' ')).toContain('number');
    expect(assessPasswordStrength('ALLUPPER1234').issues.join(' ')).toContain('lowercase');
  });

  it('rejects a common password', () => {
    expect(assessPasswordStrength('password1').valid).toBe(false);
  });

  it('rejects repeated characters', () => {
    expect(assessPasswordStrength('aaaaaaaaaaB1').issues.join(' ')).toContain(
      'sequential or repeated',
    );
  });

  it('maps score to a bar class and width', () => {
    const empty = assessPasswordStrength('');
    expect(empty.label).toBe('very weak');
    expect(empty.widthPercent).toBe('0%');
    expect(empty.barClass).toContain('orange');
  });
});
