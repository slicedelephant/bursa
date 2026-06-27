import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard, but never rejects: a valid bearer token populates
 * `request.user`, while an absent/invalid token simply leaves it undefined.
 * Lets the card-donation endpoint attribute donations to a logged-in donor
 * (building a donor account/history) without forcing login on anonymous givers.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      /* ignore — anonymous request is allowed */
    }
    return true;
  }

  handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
    // Return the user when present; otherwise undefined (no throw).
    return (user || undefined) as TUser;
  }
}
