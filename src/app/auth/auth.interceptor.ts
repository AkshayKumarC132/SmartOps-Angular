import { inject } from '@angular/core';

import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';

import { Router } from '@angular/router';

import {
  catchError,
  switchMap,
  throwError
} from 'rxjs';

import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

// ============================================================
// AUTH INTERCEPTOR
// ============================================================

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const router = inject(Router);
  const authService = inject(AuthService);

  const apiBase = environment.apiUrl.replace(/\/+$/, '');

  // Requests outside the SmartOps API are not handled here.
  const isApiRequest =
    req.url === apiBase ||
    req.url.startsWith(`${apiBase}/`) ||
    req.url.startsWith(`${apiBase}?`);

  if (!isApiRequest) {
    return next(req);
  }

  // These endpoints must remain reachable without an active access token.
  const isLoginRequest =
    /\/auth\/login\/?(?:\?.*)?$/.test(req.url);

  const isConfirmRequest =
    /\/auth\/session\/confirm\/?(?:\?.*)?$/.test(req.url);

  const isRefreshRequest =
    /\/auth\/token\/refresh\/?(?:\?.*)?$/.test(req.url);

  const isLogoutRequest =
    /\/auth\/logout\/?(?:\?.*)?$/.test(req.url);

  const isPublicAuthRequest =
    isLoginRequest ||
    isConfirmRequest ||
    isRefreshRequest ||
    isLogoutRequest;

  if (isPublicAuthRequest) {
    return next(req);
  }

  // Critical guard: do not forward protected API requests if the session
  // has expired, has been cleared, or the access token is unavailable.
  const token = authService.getAccessToken();

  if (!token) {
    console.warn(
      '[SmartOps Auth] Protected request blocked; no active session:',
      req.url
    );

    return throwError(() => new HttpErrorResponse({
      status: 401,
      statusText: 'Session expired or logged out',
      url: req.url
    }));
  }

  // Always use the current token, replacing any stale Authorization header.
  const authenticatedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authenticatedRequest).pipe(

    catchError((error: unknown) => {

      if (
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {

        return authService.refreshAccessToken().pipe(

          switchMap((newAccessToken) => {

            // Retry once with the refreshed token.
            const retryRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`
              }
            });

            return next(retryRequest);
          }),

          catchError((refreshError: unknown) => {

            // Refresh failed: clear session, stop polling and redirect.
            authService.clearSession();

            if (!router.url.startsWith('/login')) {
              void router.navigate(
                ['/login'],
                {
                  replaceUrl: true,
                  queryParams: {
                    error: 'session-expired'
                  }
                }
              );
            }

            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );

};
