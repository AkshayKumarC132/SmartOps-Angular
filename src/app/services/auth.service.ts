
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, finalize } from 'rxjs';
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
// LOGIN RESPONSE INTERFACE
// ============================================================


export interface LoginResponse {


  Message?: string;


  'Confirmation Token'?: string;


  'User Information'?: SmartOpsUser;


  [key: string]: unknown;
}




// ============================================================
// CONFIRM SESSION RESPONSE INTERFACE
// ============================================================


export interface ConfirmSessionResponse {


  Message?: string;


  Access?: string;
  Refresh?: string;


  'User Information'?: SmartOpsUser;


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


    // Clear any previous local session before a new login.
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
  // CONFIRM LOGIN SESSION
  // ==========================================================


  confirmSession(
    confirmationToken: string
  ): Observable<ConfirmSessionResponse> {


    return this.http.post<ConfirmSessionResponse>(
      `${this.apiUrl}/auth/session/confirm/`,
      {
        confirmation_token: confirmationToken
      }
    ).pipe(


      tap((response: ConfirmSessionResponse) => {


        const accessToken = response?.Access;
        const refreshToken = response?.Refresh;
        const userInformation = response?.['User Information'];


        // Validate confirmation response.
        if (
          typeof accessToken !== 'string' ||
          !accessToken.trim() ||
          typeof refreshToken !== 'string' ||
          !refreshToken.trim() ||
          !userInformation
        ) {


          throw new Error(
            'Session confirmation response is incomplete.'
          );


        }


        // Read the actual access-token expiration.
        const expiresAt =
          this.getJwtExpiration(accessToken);


        if (
          !expiresAt ||
          expiresAt <= Date.now()
        ) {


          throw new Error(
            'Session confirmation returned an invalid or expired access token.'
          );


        }


        // Store JWT tokens only after backend confirmation.
        localStorage.setItem(
          'access_token',
          accessToken
        );


        localStorage.setItem(
          'refresh_token',
          refreshToken
        );


        // Store confirmed user information.
        localStorage.setItem(
          'user',
          JSON.stringify(userInformation)
        );


        // Store access-token expiry.
        localStorage.setItem(
          this.sessionExpiryKey,
          String(expiresAt)
        );


        // Start automatic logout timer.
        this.scheduleSessionExpiry(expiresAt);


        console.log(
          'Login session confirmed successfully.'
        );


        console.log(
          'Session expires at:',
          new Date(expiresAt).toLocaleString()
        );


      })


    );


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


    // JWT expiry is authoritative.
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
  // GET REFRESH TOKEN
  // ==========================================================


  getRefreshToken(): string | null {


    // Do not use refresh tokens after local session expiry.
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
    console.log('Manual logout initiated.');


    const accessToken = this.getAccessToken();
    const refreshToken = localStorage.getItem('refresh_token');


    // If credentials are unavailable, clear local session.
    if (!accessToken || !refreshToken) {
      this.clearSession();
      void this.router.navigate(['/login']);
      return;
    }


    this.http.post(
      `${this.apiUrl}/auth/logout/`,
      { refresh: refreshToken },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    ).pipe(
      finalize(() => {
        // Always clear local authentication data.
        this.clearSession();
        void this.router.navigate(['/login']);
      })
    ).subscribe({
      next: () => {
        console.log('Backend session revoked successfully.');
      },
      error: (error) => {
        console.error('Backend logout failed:', error);
      }
    });
  }


}