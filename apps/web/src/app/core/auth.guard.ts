import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** Guards routes by login + optional `data.roles`. */
export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.parseUrl('/login');
  }
  const roles = route.data?.['roles'] as Role[] | undefined;
  if (roles && roles.length > 0 && !auth.hasRole(...roles)) {
    return router.parseUrl(auth.homeForRole());
  }
  return true;
};
