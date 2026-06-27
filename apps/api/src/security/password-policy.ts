import { DomainException } from '../common/domain.exception';

/**
 * Transparent password-strength heuristic. Pure and dependency-free (no zxcvbn,
 * which would be a large extra package). Enforced at the boundary via the
 * `@IsStrongPassword()` validator on RegisterDto; a mirror scorer exists in the
 * web app for the live meter.
 */

export interface PasswordAssessment {
  /** 0 (unusable) … 4 (strong). */
  score: number;
  /** Human label for the score. */
  label: 'very weak' | 'weak' | 'fair' | 'good' | 'strong';
  /** Whether the password meets the minimum policy. */
  valid: boolean;
  /** Reasons the password is rejected (empty when valid). */
  issues: string[];
}

export const MIN_PASSWORD_LENGTH = 10;

const COMMON_PASSWORDS = [
  'password',
  'password1',
  'passw0rd',
  '12345678',
  '123456789',
  'qwertyuiop',
  'letmein',
  'iloveyou',
  'admin123',
  'welcome1',
];

const LABELS: PasswordAssessment['label'][] = [
  'very weak',
  'weak',
  'fair',
  'good',
  'strong',
];

function hasWeakPattern(pw: string): boolean {
  const lower = pw.toLowerCase();
  // A run of 4+ identical consecutive characters, e.g. "aaaa".
  if (/(.)\1{3,}/.test(lower)) return true;
  // A sequential substring of length >= 6 (forward or reverse) from the
  // alphabet or digits, e.g. "abcdef" or "543210".
  const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789'];
  return sequences.some((seq) => {
    const reversed = seq.split('').reverse().join('');
    for (let i = 0; i + 6 <= lower.length; i++) {
      const chunk = lower.slice(i, i + 6);
      if (seq.includes(chunk) || reversed.includes(chunk)) return true;
    }
    return false;
  });
}

export function assessPassword(password: string): PasswordAssessment {
  const issues: string[] = [];
  const pw = password ?? '';

  if (pw.length < MIN_PASSWORD_LENGTH) {
    issues.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!/[a-z]/.test(pw)) issues.push('Add a lowercase letter.');
  if (!/[A-Z]/.test(pw)) issues.push('Add an uppercase letter.');
  if (!/\d/.test(pw)) issues.push('Add a number.');
  if (COMMON_PASSWORDS.includes(pw.toLowerCase())) {
    issues.push('This password is too common.');
  }
  if (pw.length >= MIN_PASSWORD_LENGTH && hasWeakPattern(pw)) {
    issues.push('Avoid sequential or repeated characters.');
  }

  // Score from positive signals, then floor by validity.
  let score = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) score++;
  if (pw.length >= 14) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(4, score);

  const valid = issues.length === 0;
  if (!valid) score = Math.min(score, 1);

  return { score, label: LABELS[score], valid, issues };
}

/** Throws a boundary VALIDATION_ERROR if the password is too weak. */
export function validateStrongPassword(password: string): void {
  const { valid, issues } = assessPassword(password);
  if (!valid) {
    throw new DomainException('VALIDATION_ERROR', issues.join(' '), 400);
  }
}
