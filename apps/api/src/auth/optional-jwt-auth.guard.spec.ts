import { ExecutionContext } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  const ctx = {} as ExecutionContext;

  it('allows the request even when the underlying strategy throws', async () => {
    const guard = new OptionalJwtAuthGuard();
    jest
      .spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)) as {
          canActivate: () => Promise<boolean>;
        },
        'canActivate',
      )
      .mockRejectedValue(new Error('no token'));
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('allows the request when the strategy resolves', async () => {
    const guard = new OptionalJwtAuthGuard();
    jest
      .spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)) as {
          canActivate: () => Promise<boolean>;
        },
        'canActivate',
      )
      .mockResolvedValue(true);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('returns the user when present, undefined otherwise', () => {
    const guard = new OptionalJwtAuthGuard();
    const user = { id: 'u1' };
    expect(guard.handleRequest(null, user)).toBe(user);
    expect(guard.handleRequest(new Error('x'), null)).toBeUndefined();
    expect(guard.handleRequest(null, false)).toBeUndefined();
  });
});
