
import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot
} from '@angular/router';

import { AuthService } from '../services/auth.service';

// ============================================================
// ROLE GUARD
// ============================================================

export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  // ==========================================================
  // CHECK AUTHENTICATION
  // ==========================================================

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  // ==========================================================
  // GET ALLOWED ROLES AND CURRENT USER ROLE
  // ==========================================================

  const allowedRoles =
    route.data['roles'] as string[] | undefined;

  const userRole =
    authService.getUserRole();

  // ==========================================================
  // VALIDATE ROLE CONFIGURATION
  // ==========================================================

  if (!allowedRoles?.length) {
    return router.createUrlTree(['/dashboard']);
  }

  if (!userRole) {
    return router.createUrlTree(
      ['/login'],
      {
        queryParams: {
          error: 'role-unavailable'
        }
      }
    );
  }

  // ==========================================================
  // NORMALIZE AND VALIDATE ROLE NAMES
  // ==========================================================

  const normalizedUserRole =
    userRole.trim().toLowerCase();

  const isAllowed = allowedRoles.some(
    role =>
      typeof role === 'string' &&
      role.trim().toLowerCase() === normalizedUserRole
  );

  // ==========================================================
  // GRANT ACCESS TO AUTHORIZED ROLES
  // ==========================================================

  if (isAllowed) {
    return true;
  }

  // ==========================================================
  // HANDLE ADMIN-ONLY ROUTES
  // ==========================================================

  const requiresAdmin = allowedRoles.some(
    role =>
      typeof role === 'string' &&
      role.trim().toLowerCase() === 'admin'
  );

  if (requiresAdmin) {

    // Preserve the valid session.
    // Do not log out users simply because their role is restricted.
    return router.createUrlTree(
      ['/login'],
      {
        queryParams: {
          error: 'not-admin'
        }
      }
    );
  }

  // ==========================================================
  // DENY OTHER UNAUTHORIZED ROUTES
  // ==========================================================

  return router.createUrlTree(['/dashboard']);
};
