import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../common/domain.exception';
import { verifyTotp } from './totp';

/**
 * Optional TOTP step-up for sensitive admin actions. When `ADMIN_TOTP_SECRET`
 * is configured, the request must carry a valid `x-mfa-token` header; otherwise
 * the guard is a no-op so the app runs without MFA configuration in dev. This is
 * the verification half of MFA — a full per-user enrolment flow is out of scope.
 */
@Injectable()
export class AdminMfaGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('ADMIN_TOTP_SECRET');
    if (!secret) return true; // MFA disabled — no-op.

    const request = context.switchToHttp().getRequest();
    const token = request.headers?.['x-mfa-token'];
    const nowSec = Math.floor(Date.now() / 1000);

    if (typeof token !== 'string' || !verifyTotp(secret, token, nowSec)) {
      throw new DomainException(
        'MFA_REQUIRED',
        'A valid multi-factor token is required for this action.',
        401,
      );
    }
    return true;
  }
}
