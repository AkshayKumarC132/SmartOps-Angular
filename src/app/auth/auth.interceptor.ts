
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

  const apiBase =
    environment.apiUrl.replace(/\/+$/, '');

  // Check whether request belongs to SmartOps API.
  const isApiRequest =
    req.url === apiBase ||
    req.url.startsWith(`${apiBase}/`) ||
    req.url.startsWith(`${apiBase}?`);

  // Authentication endpoints.
  const isLoginRequest =
    /\/auth\/login\/?(?:\?.*)?$/.test(req.url);

  const isConfirmRequest =
    /\/auth\/session\/confirm\/?(?:\?.*)?$/.test(req.url);

  const isRefreshRequest =
    /\/auth\/token\/refresh\/?(?:\?.*)?$/.test(req.url);

  const isLogoutRequest =
    /\/auth\/logout\/?(?:\?.*)?$/.test(req.url);

  const isAuthRequest =
    isLoginRequest ||
    isConfirmRequest ||
    isRefreshRequest;

  // Read access token.
  const token =
    authService.getAccessToken();

  // Attach token only to SmartOps API requests.
  const shouldAttachToken =
    !!token &&
    isApiRequest &&
    !isAuthRequest &&
    !req.headers.has('Authorization');

  const request = shouldAttachToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(request).pipe(

    catchError((error: unknown) => {

      // Refresh only for protected API requests.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest &&
        !isAuthRequest &&
        !isLogoutRequest
      ) {

        return authService.refreshAccessToken().pipe(

          switchMap((newAccessToken) => {

            // Retry original request using new access token.
            const retryRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`
              }
            });

            return next(retryRequest);

          }),

          catchError((refreshError: unknown) => {

            // Refresh service handles session cleanup.
            if (!router.url.startsWith('/login')) {
              void router.navigate(
                ['/login'],
                {
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
