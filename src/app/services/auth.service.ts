
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  throwError
} from 'rxjs';
import {
  catchError,
  finalize,
  map,
  shareReplay,
  tap
} from 'rxjs/operators';

import { environment } from '../../environments/environment';

// ============================================================
// USER INTERFACE
// ============================================================

export interface SmartOpsUser {
  id?: number | string;
  ID?: number | string;
  'User Id'?: number | string;

  username?: string;
  Username?: string;

  role?: string;
  Role?: string;

  email?: string;
  first_name?: string;
  last_name?: string;

  firstName?: string;
  lastName?: string;

  Organization?: string | number | Record<string, unknown> | null;
  organization?: number | string | Record<string, unknown> | null;
  organization_id?: number | string | null;
  organization_name?: string;

  [key: string]: unknown;
}

// ============================================================
// LOGIN RESPONSE
// ============================================================

export interface LoginResponse {
  Message?: string;
  'Confirmation Token'?: string;
  'User Information'?: SmartOpsUser;
  [key: string]: unknown;
}

// ============================================================
// SESSION CONFIRMATION RESPONSE
// ============================================================

export interface ConfirmSessionResponse {
  Message?: string;
  Access?: string;
  Refresh?: string;
  'User Information'?: SmartOpsUser;
  [key: string]: unknown;
}

// ============================================================
// TOKEN REFRESH RESPONSE
// ============================================================

interface TokenRefreshResponse {
  access: string;
  refresh?: string;
}

// ============================================================
// AUTH SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl =
    environment.apiUrl.replace(/\/+$/, '');

  private readonly sessionExpiryKey =
    'session_expires_at';

  private sessionTimer: ReturnType<typeof setTimeout> | null = null;

  private refreshRequest$: Observable<string> | null = null;

  // Authentication state.
  private readonly currentUserSubject =
    new BehaviorSubject<SmartOpsUser | null>(
      this.readStoredUser()
    );

  readonly authState$ =
    this.currentUserSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {

    this.restoreSessionTimer();

    if (typeof window !== 'undefined') {
      window.addEventListener(
        'storage',
        this.handleStorageEvent
      );
    }

  }

  // ==========================================================
  // READ STORED USER
  // ==========================================================

  private readStoredUser(): SmartOpsUser | null {

    try {

      const storedUser = localStorage.getItem('user');

      if (!storedUser) {
        return null;
      }

      const parsed = JSON.parse(storedUser);

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        return parsed as SmartOpsUser;
      }

    } catch {
      return null;
    }

    return null;
  }

  // ==========================================================
  // UPDATE AUTHENTICATION STATE
  // ==========================================================

  private updateAuthState(
    user: SmartOpsUser | null
  ): void {

    this.currentUserSubject.next(user);

  }

  // ==========================================================
  // LOGIN
  // ==========================================================

  login(
    username: string,
    password: string
  ): Observable<LoginResponse> {

    this.clearSession();

    return this.http.post<LoginResponse>(
      `${this.apiUrl}/auth/login/`,
      {
        username,
        password
      }
    );

  }

  // ==========================================================
  // ORGANIZATION VALIDATION
  // ==========================================================

  hasValidOrganization(
    user: SmartOpsUser | null
  ): boolean {

    if (!user) {
      return false;
    }

    const organization = user.Organization;

    if (
      organization &&
      typeof organization === 'object' &&
      !Array.isArray(organization)
    ) {

      const org = organization as Record<string, unknown>;

      const organizationId =
        org['Organization Id'] ?? org['id'];

      const organizationName =
        org['Organization Name'] ??
        org['name'] ??
        org['organization_name'];

      return (
        organizationId !== undefined &&
        organizationId !== null &&
        String(organizationId).trim() !== '' &&
        typeof organizationName === 'string' &&
        organizationName.trim() !== ''
      );

    }

    // Support alternative organization fields.
    return (
      user.organization_id !== undefined &&
      user.organization_id !== null &&
      !!user.organization_name?.trim()
    );

  }

  // ==========================================================
  // CONFIRM LOGIN SESSION
  // ==========================================================

  confirmSession(
    confirmationToken: string,
    loginUserInformation: SmartOpsUser
  ): Observable<ConfirmSessionResponse> {

    const role =
      loginUserInformation.Role ??
      loginUserInformation.role ??
      '';

    if (
      typeof role === 'string' &&
      role.toLowerCase() === 'admin' &&
      !this.hasValidOrganization(loginUserInformation)
    ) {

      return throwError(() =>
        new Error(
          'Organization information is missing for this Admin account.'
        )
      );

    }

    return this.http.post<ConfirmSessionResponse>(
      `${this.apiUrl}/auth/session/confirm/`,
      {
        confirmation_token: confirmationToken
      }
    ).pipe(

      tap((response) => {

        const accessToken = response?.Access;
        const refreshToken = response?.Refresh;

        const confirmedUser =
          response?.['User Information'];

        if (
          !accessToken ||
          !refreshToken ||
          !confirmedUser
        ) {
          throw new Error(
            'Session confirmation response is incomplete.'
          );
        }

        // Preserve organization from initial login response.
        const userInformation: SmartOpsUser = {

          ...loginUserInformation,
          ...confirmedUser,

          Organization:
            loginUserInformation.Organization ??
            confirmedUser.Organization,

          organization:
            loginUserInformation.organization ??
            confirmedUser.organization,

          organization_id:
            loginUserInformation.organization_id ??
            confirmedUser.organization_id,

          organization_name:
            loginUserInformation.organization_name ??
            confirmedUser.organization_name

        };

        if (
          typeof role === 'string' &&
          role.toLowerCase() === 'admin' &&
          !this.hasValidOrganization(userInformation)
        ) {
          throw new Error(
            'Admin account does not have valid organization information.'
          );
        }

        const expiresAt =
          this.getJwtExpiration(accessToken);

        if (!expiresAt || expiresAt <= Date.now()) {
          throw new Error(
            'Invalid or expired access token.'
          );
        }

        localStorage.setItem(
          'access_token',
          accessToken
        );

        localStorage.setItem(
          'refresh_token',
          refreshToken
        );

        localStorage.setItem(
          'user',
          JSON.stringify(userInformation)
        );

        localStorage.setItem(
          this.sessionExpiryKey,
          String(expiresAt)
        );

        this.updateAuthState(userInformation);

        this.scheduleSessionRefresh(expiresAt);

      })

    );

  }

  // ==========================================================
  // READ JWT EXPIRATION
  // ==========================================================

  private getJwtExpiration(
    token: string
  ): number | null {

    try {

      const parts = token.split('.');

      if (parts.length !== 3) {
        return null;
      }

      const base64 = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const paddedBase64 = base64.padEnd(
        base64.length +
        ((4 - base64.length % 4) % 4),
        '='
      );

      const payload = JSON.parse(
        atob(paddedBase64)
      );

      if (typeof payload.exp !== 'number') {
        return null;
      }

      return payload.exp * 1000;

    } catch {
      return null;
    }

  }

  // ==========================================================
  // AUTOMATIC ACCESS TOKEN REFRESH
  // ==========================================================

  refreshAccessToken(): Observable<string> {

    // Prevent multiple simultaneous refresh requests.
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    const refreshToken =
      localStorage.getItem('refresh_token');

    if (!refreshToken) {

      this.expireSession();

      return throwError(() =>
        new Error('Refresh token is unavailable.')
      );

    }

    this.refreshRequest$ = this.http.post<TokenRefreshResponse>(
      `${this.apiUrl}/auth/token/refresh/`,
      {
        refresh: refreshToken
      }
    ).pipe(

      map((response) => {

        if (
          !response ||
          typeof response.access !== 'string' ||
          !response.access.trim()
        ) {
          throw new Error(
            'Token refresh response is invalid.'
          );
        }

        return response.access;

      }),

      tap((newAccessToken) => {

        const expiresAt =
          this.getJwtExpiration(newAccessToken);

        if (!expiresAt || expiresAt <= Date.now()) {
          throw new Error(
            'Refreshed access token is invalid.'
          );
        }

        localStorage.setItem(
          'access_token',
          newAccessToken
        );

        // Update refresh token only if backend rotates it.
        // Your current backend does not enable rotation.
        // Keep the existing refresh token otherwise.
        const responseRefreshToken =
          localStorage.getItem('refresh_token');

        if (responseRefreshToken) {
          localStorage.setItem(
            'refresh_token',
            responseRefreshToken
          );
        }

        localStorage.setItem(
          this.sessionExpiryKey,
          String(expiresAt)
        );

        this.scheduleSessionRefresh(expiresAt);

      }),

      catchError((error) => {

        this.expireSession();

        return throwError(() => error);

      }),

      finalize(() => {
        this.refreshRequest$ = null;
      }),

      shareReplay({
        bufferSize: 1,
        refCount: false
      })

    );

    return this.refreshRequest$;

  }

  // ==========================================================
  // SCHEDULE AUTOMATIC TOKEN REFRESH
  // ==========================================================

  private scheduleSessionRefresh(
    expiresAt: number
  ): void {

    this.clearSessionTimer();

    const remainingTime =
      expiresAt - Date.now();

    if (remainingTime <= 0) {

      this.refreshAccessToken().subscribe({
        error: () => this.expireSession()
      });

      return;
    }

    // Refresh 60 seconds before access token expires.
    const refreshDelay = Math.max(
      1000,
      remainingTime - 60000
    );

    this.sessionTimer = setTimeout(() => {

      this.refreshAccessToken().subscribe({
        error: () => this.expireSession()
      });

    }, refreshDelay);

  }

  // ==========================================================
  // RESTORE SESSION AFTER PAGE REFRESH
  // ==========================================================

  private restoreSessionTimer(): void {

    const accessToken =
      localStorage.getItem('access_token');

    const refreshToken =
      localStorage.getItem('refresh_token');

    if (!accessToken || !refreshToken) {
      return;
    }

    const expiresAt =
      this.getJwtExpiration(accessToken);

    if (!expiresAt) {
      this.expireSession();
      return;
    }

    this.updateAuthState(this.readStoredUser());

    if (expiresAt <= Date.now()) {

      this.refreshAccessToken().subscribe({
        error: () => this.expireSession()
      });

      return;
    }

    localStorage.setItem(
      this.sessionExpiryKey,
      String(expiresAt)
    );

    this.scheduleSessionRefresh(expiresAt);

  }

  // ==========================================================
  // CLEAR SESSION TIMER
  // ==========================================================

  private clearSessionTimer(): void {

    if (this.sessionTimer !== null) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

  }

  // ==========================================================
  // AUTOMATIC SESSION EXPIRY
  // ==========================================================

  private expireSession(): void {

    const hadActiveSession =
      !!localStorage.getItem('access_token');

    this.clearSession();

    if (
      hadActiveSession &&
      !this.router.url.startsWith('/login')
    ) {

      void this.router.navigate(
        ['/login'],
        {
          queryParams: {
            error: 'session-expired'
          }
        }
      );

    }

  }

  // ==========================================================
  // GET ACCESS TOKEN
  // ==========================================================

  getAccessToken(): string | null {

    const token =
      localStorage.getItem('access_token');

    if (!token) {
      return null;
    }

    // Do not immediately clear the session when the access
    // token expires. The interceptor can attempt a refresh.
    return token;

  }

  // ==========================================================
  // GET REFRESH TOKEN
  // ==========================================================

  getRefreshToken(): string | null {

    return localStorage.getItem('refresh_token');

  }

  // ==========================================================
  // GET USER
  // ==========================================================

  getUser(): SmartOpsUser | null {

    const user = this.readStoredUser();

    if (!user) {
      return null;
    }

    return user;

  }

  // ==========================================================
  // GET USER ROLE
  // ==========================================================

  getUserRole(): string | null {

    const user = this.getUser();

    const role =
      user?.Role ??
      user?.role ??
      null;

    if (
      typeof role !== 'string' ||
      !role.trim()
    ) {
      return null;
    }

    return role.trim();

  }

  // ==========================================================
  // ADMIN CHECK
  // ==========================================================

  isAdmin(): boolean {

    return (
      this.getUserRole()?.toLowerCase() === 'admin'
    );

  }

  // ==========================================================
  // TEAM MEMBER CHECK
  // ==========================================================

  isTeamMember(): boolean {

    return (
      this.getUserRole()?.toLowerCase() === 'team member'
    );

  }

  // ==========================================================
  // REQUESTER CHECK
  // ==========================================================

  isRequester(): boolean {

    return (
      this.getUserRole()?.toLowerCase() === 'requester'
    );

  }

  // ==========================================================
  // LOGIN STATUS
  // ==========================================================

  isLoggedIn(): boolean {

    return (
      !!localStorage.getItem('access_token') &&
      !!this.getUser()
    );

  }

  // ==========================================================
  // AUTHENTICATION STATE
  // ==========================================================

  getCurrentUser(): SmartOpsUser | null {

    return this.currentUserSubject.value;

  }

  // ==========================================================
  // MULTI-TAB LOGOUT SYNCHRONIZATION
  // ==========================================================

  private handleStorageEvent = (
    event: StorageEvent
  ): void => {

    if (
      event.key === 'access_token' ||
      event.key === 'user' ||
      event.key === null
    ) {

      const accessToken =
        localStorage.getItem('access_token');

      const user =
        accessToken
          ? this.readStoredUser()
          : null;

      if (!accessToken) {

        this.clearSessionTimer();

        this.updateAuthState(null);

        if (!this.router.url.startsWith('/login')) {
          void this.router.navigate(['/login']);
        }

        return;

      }

      this.updateAuthState(user);

      const expiresAt =
        this.getJwtExpiration(accessToken);

      if (expiresAt && expiresAt > Date.now()) {
        this.scheduleSessionRefresh(expiresAt);
      }

    }

  };

  // ==========================================================
  // CLEAR SESSION
  // ==========================================================

  clearSession(): void {

    this.clearSessionTimer();

    this.refreshRequest$ = null;

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem(this.sessionExpiryKey);

    this.updateAuthState(null);

  }

  // ==========================================================
  // LOGOUT API
  // ==========================================================

  logoutApi(): Observable<any> {

    const accessToken =
      localStorage.getItem('access_token');

    const refreshToken =
      localStorage.getItem('refresh_token');

    return this.http.post(
      `${this.apiUrl}/auth/logout/`,
      {
        refresh: refreshToken
      },
      {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`
            }
          : {}
      }
    );

  }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  logout(): void {

    const accessToken =
      localStorage.getItem('access_token');

    const refreshToken =
      localStorage.getItem('refresh_token');

    if (!accessToken || !refreshToken) {

      this.clearSession();

      void this.router.navigate(['/login']);

      return;

    }

    this.http.post(
      `${this.apiUrl}/auth/logout/`,
      {
        refresh: refreshToken
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    ).pipe(

      finalize(() => {

        this.clearSession();

        void this.router.navigate(['/login']);

      })

    ).subscribe({
      error: () => {
        // Local logout still occurs if the backend request fails.
      }
    });

  }

}
