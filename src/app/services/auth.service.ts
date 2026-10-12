
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient
  ) {}


  // ============================================================
  // LOGIN
  // ============================================================

  login(
    username: string,
    password: string
  ): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/auth/login/`,
      {
        username,
        password
      }
    ).pipe(

      tap((response: any) => {

        console.log(
          'Backend login response:',
          response
        );

        console.log(
          'Backend login response JSON:',
          JSON.stringify(response)
        );


        // ======================================================
        // ACCESS TOKEN
        // ======================================================

        const accessToken =
          response?.Access ??
          response?.access ??
          response?.access_token ??
          response?.accessToken ??
          null;


        if (accessToken) {

          localStorage.setItem(
            'access_token',
            accessToken
          );

          console.log(
            'Access token stored successfully'
          );

        } else {

          // Avoid retaining a token from an older session.
          localStorage.removeItem('access_token');

          console.error(
            'Access token is missing from login response'
          );
        }


        // ======================================================
        // REFRESH TOKEN
        // ======================================================

        const refreshToken =
          response?.Refresh ??
          response?.refresh ??
          response?.refresh_token ??
          response?.refreshToken ??
          null;


        if (refreshToken) {

          localStorage.setItem(
            'refresh_token',
            refreshToken
          );

          console.log(
            'Refresh token stored successfully'
          );

        } else {

          localStorage.removeItem('refresh_token');

          console.warn(
            'Refresh token is missing from login response'
          );
        }


        // ======================================================
        // USER INFORMATION
        // ======================================================

        let userInformation: any = null;


        // Option 1:
        // "User Information"

        if (response?.['User Information']) {

          userInformation =
            response['User Information'];
        }


        // Option 2:
        // "user"

        else if (response?.user) {

          userInformation =
            response.user;
        }


        // Option 3:
        // "User"

        else if (response?.User) {

          userInformation =
            response.User;
        }


        // Option 4:
        // "data.user"

        else if (response?.data?.user) {

          userInformation =
            response.data.user;
        }


        // Option 5:
        // "Data.User"

        else if (response?.Data?.User) {

          userInformation =
            response.Data.User;
        }


        // Option 6:
        // "Data.User Information"

        else if (
          response?.Data?.['User Information']
        ) {

          userInformation =
            response.Data['User Information'];
        }


        // ======================================================
        // STORE USER
        // ======================================================

        if (
          userInformation &&
          typeof userInformation === 'object' &&
          !Array.isArray(userInformation)
        ) {

          localStorage.setItem(
            'user',
            JSON.stringify(userInformation)
          );

          console.log(
            'User stored successfully:',
            userInformation
          );

          console.log(
            'Stored user:',
            localStorage.getItem('user')
          );

        } else {

          // Do not reuse another user's stored role.
          localStorage.removeItem('user');

          console.error(
            'User information could not be found in login response.'
          );

          console.error(
            'Available login response keys:',
            Object.keys(response || {})
          );
        }

      })
    );
  }


  // ============================================================
  // GET ACCESS TOKEN
  // ============================================================

  getAccessToken(): string | null {

    return localStorage.getItem(
      'access_token'
    );
  }


  // ============================================================
  // GET REFRESH TOKEN
  // ============================================================

  getRefreshToken(): string | null {

    return localStorage.getItem(
      'refresh_token'
    );
  }


  // ============================================================
  // GET USER
  // ============================================================

  getUser(): any {

    const user =
      localStorage.getItem('user');


    if (!user) {

      return null;
    }


    try {

      const parsedUser = JSON.parse(user);

      if (
        !parsedUser ||
        typeof parsedUser !== 'object' ||
        Array.isArray(parsedUser)
      ) {
        return null;
      }

      return parsedUser;

    } catch (error) {

      console.error(
        'Unable to parse stored user:',
        error
      );

      // Remove invalid stored user information.
      localStorage.removeItem('user');

      return null;
    }
  }


  // ============================================================
  // GET USER ROLE
  // ============================================================

  getUserRole(): string | null {

    const user =
      this.getUser();


    if (!user) {

      return null;
    }


    const role =
      user.Role ??
      user.role ??
      null;


    if (
      typeof role !== 'string' ||
      !role.trim()
    ) {

      return null;
    }


    return role.trim();
  }


  // ============================================================
  // ADMIN
  // ============================================================

  isAdmin(): boolean {

    return (
      this.getUserRole()?.toLowerCase() === 'admin'
    );
  }


  // ============================================================
  // TEAM MEMBER
  // ============================================================

  isTeamMember(): boolean {

    return (
      this.getUserRole()?.toLowerCase() === 'team member'
    );
  }


  // ============================================================
  // REQUESTER
  // ============================================================

  isRequester(): boolean {

    return (
      this.getUserRole()?.toLowerCase() === 'requester'
    );
  }


  // ============================================================
  // LOGIN STATUS
  // ============================================================

  isLoggedIn(): boolean {

    return !!this.getAccessToken();
  }


  // ============================================================
  // LOGOUT
  // ============================================================

  logout(): void {

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

}
