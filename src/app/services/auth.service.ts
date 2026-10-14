
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  constructor(
    private readonly http: HttpClient
  ) {}

  // ==========================================================
  // LOGIN
  // ==========================================================

  login(
    username: string,
    password: string
  ): Observable<LoginResponse> {

    // Clear stale information before starting a new login.
    this.clearSession();

    return this.http.post<LoginResponse>(
      `${this.apiUrl}/auth/login/`,
      {
        username,
        password
      }
    ).pipe(
      tap((response: LoginResponse) => {

        // ====================================================
        // ACCESS TOKEN
        // ====================================================

        const accessToken =
          response?.Access ??
          response?.access ??
          response?.access_token ??
          response?.accessToken ??
          null;

        // ====================================================
        // REFRESH TOKEN
        // ====================================================

        const refreshToken =
          response?.Refresh ??
          response?.refresh ??
          response?.refresh_token ??
          response?.refreshToken ??
          null;

        // ====================================================
        // USER INFORMATION
        // ====================================================

        const userInformation =
          this.extractUser(response);

        // ====================================================
        // VALIDATE ACCESS TOKEN
        // ====================================================

        if (
          typeof accessToken !== 'string' ||
          !accessToken.trim()
        ) {
          this.clearSession();

          throw new Error(
            'Login response did not contain a valid access token.'
          );
        }

        // ====================================================
        // VALIDATE USER INFORMATION
        // ====================================================

        if (!userInformation) {
          this.clearSession();

          throw new Error(
            'Login response did not contain valid user information.'
          );
        }

        // ====================================================
        // STORE ACCESS TOKEN
        // ====================================================

        localStorage.setItem(
          'access_token',
          accessToken
        );

        // ====================================================
        // STORE REFRESH TOKEN
        // ====================================================

        if (
          typeof refreshToken === 'string' &&
          refreshToken.trim()
        ) {
          localStorage.setItem(
            'refresh_token',
            refreshToken
          );
        }

        // ====================================================
        // STORE USER INFORMATION
        // ====================================================

        localStorage.setItem(
          'user',
          JSON.stringify(userInformation)
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
  // GET ACCESS TOKEN
  // ==========================================================

  getAccessToken(): string | null {

    return localStorage.getItem(
      'access_token'
    );
  }

  // ==========================================================
  // GET REFRESH TOKEN
  // ==========================================================

  getRefreshToken(): string | null {

    return localStorage.getItem(
      'refresh_token'
    );
  }

  // ==========================================================
  // GET USER
  // ==========================================================

  getUser(): SmartOpsUser | null {

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

    localStorage.removeItem(
      'access_token'
    );

    localStorage.removeItem(
      'refresh_token'
    );

    localStorage.removeItem(
      'user'
    );
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  logout(): void {

    this.clearSession();
  }

}
