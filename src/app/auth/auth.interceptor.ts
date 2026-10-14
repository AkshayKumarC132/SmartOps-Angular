
import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';

// ============================================================
// AUTH INTERCEPTOR
// ============================================================

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const router = inject(Router);

  // Normalize the configured API URL.
  const apiBase = environment.apiUrl.replace(/\/+$/, '');

  // ==========================================================
  // CHECK WHETHER REQUEST TARGETS OUR API
  // ==========================================================

  const isApiRequest =
    req.url === apiBase ||
    req.url.startsWith(`${apiBase}/`) ||
    req.url.startsWith(`${apiBase}?`);

  // ==========================================================
  // IDENTIFY AUTHENTICATION ENDPOINTS
  // ==========================================================

  const isLoginRequest =
    /\/auth\/login\/?(?:\?.*)?$/.test(req.url);

  // ==========================================================
  // READ ACCESS TOKEN
  // ==========================================================

  const token = localStorage.getItem('access_token');

  // ==========================================================
  // ATTACH AUTHORIZATION HEADER
  // ==========================================================

  // Do not send credentials to external URLs or login requests.
  // Preserve an existing Authorization header if one is supplied.
  const shouldAttachToken =
    !!token &&
    isApiRequest &&
    !isLoginRequest &&
    !req.headers.has('Authorization');

  const request = shouldAttachToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  // ==========================================================
  // HANDLE HTTP ERRORS
  // ==========================================================

  return next(request).pipe(

    catchError((error: unknown) => {

      // ======================================================
      // HANDLE EXPIRED OR INVALID AUTHENTICATION
      // ======================================================

      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest &&
        !isLoginRequest
      ) {

        // Clear session data to prevent stale user information.
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');

        // Avoid repeatedly navigating to the login page.
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
      }

      // Preserve the original error for existing subscribers.
      return throwError(() => error);

    })

  );
};
