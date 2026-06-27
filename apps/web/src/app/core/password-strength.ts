// Pure password-strength scorer for the live register meter. Mirrors the API's
// `password-policy` heuristic (intentionally duplicated across the app boundary
// rather than shared — both sides are small and independently tested). No
// Angular, no I/O.

export type StrengthLabel = 'very weak' | 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrength {
  /** 0 (unusable) … 4 (strong). */
  score: number;
  label: StrengthLabel;
  /** Whether the password satisfies the minimum policy. */
  valid: boolean;
  /** Concrete, fixable reasons it is not yet acceptable. */
  issues: string[];
  /** Tailwind bar colour for the meter. */
  barClass: string;
  /** Meter fill width as a percentage string, e.g. "60%". */
  widthPercent: string;
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

const LABELS: StrengthLabel[] = ['very weak', 'weak', 'fair', 'good', 'strong'];
const BAR_CLASSES = [
  'bg-brand-orange',
  'bg-brand-orange',
  'bg-amber-400',
  'bg-brand-green/70',
  'bg-brand-green',
];

function hasWeakPattern(pw: string): boolean {
  const lower = pw.toLowerCase();
  if (/(.)\1{3,}/.test(lower)) return true;
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

export function assessPasswordStrength(password: string): PasswordStrength {
  const pw = password ?? '';
  const issues: string[] = [];

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

  let score = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) score++;
  if (pw.length >= 14) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(4, score);

  const valid = issues.length === 0;
  if (!valid) score = Math.min(score, 1);

  return {
    score,
    label: LABELS[score],
    valid,
    issues,
    barClass: BAR_CLASSES[score],
    widthPercent: `${(score / 4) * 100}%`,
  };
}
