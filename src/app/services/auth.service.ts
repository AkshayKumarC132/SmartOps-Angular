
import { Injectable } from '@angular/core';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { Router } from '@angular/router';

import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';


// ============================================================
// USER INTERFACE
// ============================================================

export interface SmartOpsUser {

  id?: number | string;
  ID?: number | string;

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
// LOGIN RESPONSE INTERFACE
// ============================================================

export interface LoginResponse {

  Access?: string;
  access?: string;
  access_token?: string;
  accessToken?: string;

  Refresh?: string;
  refresh?: string;
  refresh_token?: string;
  refreshToken?: string;

  'User Information'?: SmartOpsUser;
  user?: SmartOpsUser;
  User?: SmartOpsUser;

  data?: {
    user?: SmartOpsUser;
  };

  Data?: {
    User?: SmartOpsUser;
    'User Information'?: SmartOpsUser;
  };

  [key: string]: unknown;

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


  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {

    // Restore the expiry timer when the page is refreshed.
    this.restoreSessionTimer();

  }


  // ==========================================================
  // LOGIN
  // ==========================================================

  login(
    username: string,
    password: string
  ): Observable<LoginResponse> {

    // Clear any previous session before a new login.
    this.clearSession();

    return this.http.post<LoginResponse>(
      `${this.apiUrl}/auth/login/`,
      {
        username,
        password
      }
    ).pipe(

      tap((response: LoginResponse) => {

        const accessToken =
          response?.Access ??
          response?.access ??
          response?.access_token ??
          response?.accessToken ??
          null;


        const refreshToken =
          response?.Refresh ??
          response?.refresh ??
          response?.refresh_token ??
          response?.refreshToken ??
          null;


        const userInformation =
          this.extractUser(response);


        // Validate access token.
        if (
          typeof accessToken !== 'string' ||
          !accessToken.trim()
        ) {

          this.clearSession();

          throw new Error(
            'Login response did not contain a valid access token.'
          );

        }


        // Validate user information.
        if (!userInformation) {

          this.clearSession();

          throw new Error(
            'Login response did not contain valid user information.'
          );

        }


        // Read the actual JWT expiration timestamp.
        const expiresAt =
          this.getJwtExpiration(accessToken);


        if (
          !expiresAt ||
          expiresAt <= Date.now()
        ) {

          this.clearSession();

          throw new Error(
            'Login returned an expired or invalid access token.'
          );

        }


        // Store access token.
        localStorage.setItem(
          'access_token',
          accessToken
        );


        // Store refresh token.
        if (
          typeof refreshToken === 'string' &&
          refreshToken.trim()
        ) {

          localStorage.setItem(
            'refresh_token',
            refreshToken
          );

        }


        // Store user information.
        localStorage.setItem(
          'user',
          JSON.stringify(userInformation)
        );


        // Store the fixed session-expiry timestamp.
        localStorage.setItem(
          this.sessionExpiryKey,
          String(expiresAt)
        );


        // Start the automatic logout timer.
        this.scheduleSessionExpiry(expiresAt);


        console.log(
          'Login successful.'
        );


        console.log(
          'Session expires at:',
          new Date(expiresAt).toLocaleString()
        );

      })

    );

  }


  // ==========================================================
  // EXTRACT USER FROM LOGIN RESPONSE
  // ==========================================================

  private extractUser(
    response: LoginResponse | null | undefined
  ): SmartOpsUser | null {

    const candidates: unknown[] = [

      response?.['User Information'],
      response?.user,
      response?.User,
      response?.data?.user,
      response?.Data?.User,
      response?.Data?.['User Information']

    ];


    for (const candidate of candidates) {

      if (
        candidate !== null &&
        typeof candidate === 'object' &&
        !Array.isArray(candidate)
      ) {

        return candidate as SmartOpsUser;

      }

    }


    return null;

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


      // JWT exp is in seconds. JavaScript timestamps are milliseconds.
      return payload.exp * 1000;


    } catch (error) {

      console.error(
        'Unable to read JWT expiration:',
        error
      );

      return null;

    }

  }


  // ==========================================================
  // SCHEDULE AUTOMATIC SESSION EXPIRY
  // ==========================================================

  private scheduleSessionExpiry(
    expiresAt: number
  ): void {

    this.clearSessionTimer();

    const remainingTime =
      expiresAt - Date.now();


    if (remainingTime <= 0) {

      this.expireSession();
      return;

    }


    console.log(
      `Automatic logout scheduled in ${Math.ceil(remainingTime / 60000)} minutes.`
    );


    this.sessionTimer = setTimeout(() => {

      this.expireSession();

    }, remainingTime);

  }


  // ==========================================================
  // RESTORE SESSION TIMER AFTER PAGE REFRESH
  // ==========================================================

  private restoreSessionTimer(): void {

    const accessToken =
      localStorage.getItem('access_token');


    if (!accessToken) {
      return;
    }


    const expiresAt =
      this.getJwtExpiration(accessToken);


    if (
      !expiresAt ||
      expiresAt <= Date.now()
    ) {

      this.expireSession();
      return;

    }


    // The JWT is authoritative; do not extend its expiry
    // using a client-stored timestamp.

    localStorage.setItem(
      this.sessionExpiryKey,
      String(expiresAt)
    );


    this.scheduleSessionExpiry(expiresAt);

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


    // Remove all locally stored authentication data.
    this.clearSession();


    console.warn(
      'SmartOps session expired. Authentication data cleared.'
    );


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


    const expiresAt =
      this.getJwtExpiration(token);


    if (
      !expiresAt ||
      Date.now() >= expiresAt
    ) {

      this.expireSession();
      return null;

    }


    return token;

  }


  // ==========================================================
  // CONFIRM LOGIN SESSION
  // ==========================================================

  confirmSession(): Observable<any> {

    const accessToken = this.getAccessToken();


    if (!accessToken) {

      throw new Error(
        'Access token is missing. Session cannot be confirmed.'
      );

    }


    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`
    });


    return this.http.post<any>(
      `${this.apiUrl}/auth/session/confirm/`,
      {},
      { headers }
    );

  }


  // ==========================================================
  // CANCEL PENDING SESSION
  // ==========================================================

  cancelPendingSession(): Observable<any> {

    const accessToken = this.getAccessToken();


    if (!accessToken) {

      throw new Error(
        'Access token is missing.'
      );

    }


    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`
    });


    return this.http.post<any>(
      `${this.apiUrl}/auth/session/cancel/`,
      {},
      { headers }
    );

  }


  // ==========================================================
  // GET REFRESH TOKEN
  // ==========================================================

  getRefreshToken(): string | null {

    // Never return a refresh token after the fixed session expires.
    if (!this.getAccessToken()) {
      return null;
    }


    return localStorage.getItem(
      'refresh_token'
    );

  }


  // ==========================================================
  // GET USER
  // ==========================================================

  getUser(): SmartOpsUser | null {

    if (!this.getAccessToken()) {
      return null;
    }


    const storedUser =
      localStorage.getItem('user');


    if (!storedUser) {
      return null;
    }


    try {

      const parsedUser: unknown =
        JSON.parse(storedUser);


      if (
        parsedUser !== null &&
        typeof parsedUser === 'object' &&
        !Array.isArray(parsedUser)
      ) {

        return parsedUser as SmartOpsUser;

      }


    } catch {

      // Invalid JSON must not be reused.

    }


    this.clearSession();

    return null;

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
      !!this.getAccessToken() &&
      !!this.getUser()
    );

  }


  // ==========================================================
  // CLEAR SESSION
  // ==========================================================

  clearSession(): void {

    this.clearSessionTimer();


    localStorage.removeItem(
      'access_token'
    );


    localStorage.removeItem(
      'refresh_token'
    );


    localStorage.removeItem(
      'user'
    );


    localStorage.removeItem(
      this.sessionExpiryKey
    );

  }


  // ==========================================================
  // LOGOUT
  // ==========================================================

  logout(): void {

    console.log(
      'Manual logout initiated.'
    );


    this.clearSession();

  }

}
