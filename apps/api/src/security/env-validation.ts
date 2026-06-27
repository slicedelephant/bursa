/**
 * Boot-time validation of security-relevant environment variables. Pure: takes
 * a plain env record and returns either the issues found or an empty list.
 * `main.ts` throws on issues in production (fail-closed against
 * misconfiguration, OWASP A05) and only warns in development so local dev stays
 * frictionless. Dependency-free (no zod) to avoid adding a package to the API.
 */

export interface EnvValidationResult {
  /** Hard problems that must block a production boot. */
  errors: string[];
  /** Advisory problems (logged, non-blocking). */
  warnings: string[];
}

const INSECURE_JWT_DEFAULTS = ['dev-only-change-me', 'changeme', 'secret'];
const MIN_SECRET_LENGTH = 32;

type Env = Record<string, string | undefined>;

export function validateEnv(env: Env): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = (env.NODE_ENV ?? 'development') === 'production';
  const push = (msg: string) => (isProd ? errors : warnings).push(msg);

  // DATABASE_URL is required everywhere.
  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is not set.');
  }

  // JWT secret must be present, long enough and not a known default.
  const jwt = env.JWT_SECRET;
  if (!jwt) {
    push('JWT_SECRET is not set.');
  } else {
    if (INSECURE_JWT_DEFAULTS.includes(jwt.toLowerCase())) {
      push(`JWT_SECRET uses an insecure default value.`);
    }
    if (jwt.length < MIN_SECRET_LENGTH) {
      push(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
    }
  }

  // Payment provider must be a known value; stripe needs its secrets.
  const provider = env.PAYMENT_PROVIDER ?? 'mock';
  if (!['mock', 'stripe'].includes(provider)) {
    push(`PAYMENT_PROVIDER must be "mock" or "stripe" (got "${provider}").`);
  }
  if (provider === 'stripe') {
    if (!env.STRIPE_SECRET_KEY) {
      push('PAYMENT_PROVIDER=stripe requires STRIPE_SECRET_KEY.');
    }
    if (!env.STRIPE_WEBHOOK_SECRET) {
      push('PAYMENT_PROVIDER=stripe requires STRIPE_WEBHOOK_SECRET.');
    }
  }

  return { errors, warnings };
}
