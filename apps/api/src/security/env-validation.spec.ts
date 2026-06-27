import { validateEnv } from './env-validation';

const SAFE_SECRET = 'a'.repeat(40);

const prodBase = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@db:5432/app',
  JWT_SECRET: SAFE_SECRET,
  PAYMENT_PROVIDER: 'mock',
};

describe('validateEnv', () => {
  it('accepts a safe production config', () => {
    const { errors } = validateEnv(prodBase);
    expect(errors).toEqual([]);
  });

  it('rejects an insecure default JWT secret in production', () => {
    const { errors } = validateEnv({ ...prodBase, JWT_SECRET: 'dev-only-change-me' });
    expect(errors.join(' ')).toContain('insecure default');
  });

  it('rejects a too-short JWT secret in production', () => {
    const { errors } = validateEnv({ ...prodBase, JWT_SECRET: 'short' });
    expect(errors.join(' ')).toContain('at least 32');
  });

  it('requires stripe secrets when provider is stripe', () => {
    const { errors } = validateEnv({ ...prodBase, PAYMENT_PROVIDER: 'stripe' });
    expect(errors.join(' ')).toContain('STRIPE_SECRET_KEY');
    expect(errors.join(' ')).toContain('STRIPE_WEBHOOK_SECRET');
  });

  it('accepts stripe when both secrets are present', () => {
    const { errors } = validateEnv({
      ...prodBase,
      PAYMENT_PROVIDER: 'stripe',
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
    });
    expect(errors).toEqual([]);
  });

  it('rejects an unknown payment provider', () => {
    const { errors } = validateEnv({ ...prodBase, PAYMENT_PROVIDER: 'paypal' });
    expect(errors.join(' ')).toContain('PAYMENT_PROVIDER');
  });

  it('always treats a missing DATABASE_URL as an error', () => {
    const { errors } = validateEnv({ NODE_ENV: 'development', JWT_SECRET: SAFE_SECRET });
    expect(errors.join(' ')).toContain('DATABASE_URL');
  });

  it('downgrades secret problems to warnings in development', () => {
    const { errors, warnings } = validateEnv({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://u:p@db:5432/app',
      JWT_SECRET: 'dev-only-change-me',
    });
    expect(errors).toEqual([]);
    expect(warnings.join(' ')).toContain('insecure default');
  });
});
