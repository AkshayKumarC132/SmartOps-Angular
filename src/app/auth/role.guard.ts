
import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  // Check authentication first.
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  // Read the allowed roles configured on the route.
  const allowedRoles = route.data['roles'] as string[] | undefined;
  const userRole = authService.getUserRole();

  // Deny access if role information or route configuration is missing.
  if (!allowedRoles?.length || !userRole) {
    return router.createUrlTree(['/dashboard']);
  }

  // Compare role names without case sensitivity.
  const isAllowed = allowedRoles.some(
    role => role.toLowerCase() === userRole.toLowerCase()
  );

  if (isAllowed) {
    return true;
  }

  // Show an access-denied message for non-admins attempting
  // to access the Admin Portal.
  if (allowedRoles.some(role => role.toLowerCase() === 'admin')) {
    authService.logout();

    return router.createUrlTree(['/login'], {
      queryParams: { error: 'not-admin' }
    });
  }

  return router.createUrlTree(['/dashboard']);
};
