import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminMfaGuard } from './admin-mfa.guard';
import { generateTotp } from './totp';

const SECRET = 'admin-totp-secret';

function context(headers: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

function guardWith(secret: string | undefined): AdminMfaGuard {
  const config = { get: () => secret } as unknown as ConfigService;
  return new AdminMfaGuard(config);
}

describe('AdminMfaGuard', () => {
  it('is a no-op when ADMIN_TOTP_SECRET is unset', () => {
    const guard = guardWith(undefined);
    expect(guard.canActivate(context({}))).toBe(true);
  });

  it('admits a valid TOTP token', () => {
    const guard = guardWith(SECRET);
    const token = generateTotp(SECRET, Math.floor(Date.now() / 1000));
    expect(guard.canActivate(context({ 'x-mfa-token': token }))).toBe(true);
  });

  it('rejects a missing token when MFA is enabled', () => {
    const guard = guardWith(SECRET);
    expect(() => guard.canActivate(context({}))).toThrow();
  });

  it('rejects an invalid token', () => {
    const guard = guardWith(SECRET);
    expect(() => guard.canActivate(context({ 'x-mfa-token': '000000' }))).toThrow();
  });
});
