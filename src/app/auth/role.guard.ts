import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const requesterGuard: CanActivateFn = () => {

  const authService = inject(AuthService);
  const router = inject(Router);

  if (
    authService.isLoggedIn() &&
    authService.isRequester()
  ) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};