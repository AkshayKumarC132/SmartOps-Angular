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

  login(username: string, password: string): Observable<any> {

    return this.http.post<any>(
      `${this.apiUrl}/auth/login/`,
      {
        username,
        password
      }
    ).pipe(

      tap((response) => {

        console.log(
          'Backend login response:',
          response
        );

        /*
         * Store access token
         */
        if (response?.Access) {

          localStorage.setItem(
            'access_token',
            response.Access
          );

          console.log(
            'Access token stored'
          );
        }

        /*
         * Store refresh token
         */
        if (response?.Refresh) {

          localStorage.setItem(
            'refresh_token',
            response.Refresh
          );

          console.log(
            'Refresh token stored'
          );
        }

        /*
         * Backend sends the user as
         * "User Information"
         */
        const userInformation =
          response?.['User Information'];

        if (userInformation) {

          localStorage.setItem(
            'user',
            JSON.stringify(userInformation)
          );

          console.log(
            'User stored:',
            userInformation
          );

          console.log(
            'Stored user:',
            localStorage.getItem('user')
          );

        } else {

          console.error(
            'User Information is missing from login response'
          );
        }

      })
    );
  }


  getAccessToken(): string | null {

    return localStorage.getItem(
      'access_token'
    );
  }


  getRefreshToken(): string | null {

    return localStorage.getItem(
      'refresh_token'
    );
  }


  getUser(): any {

    const user = localStorage.getItem(
      'user'
    );

    if (!user) {
      return null;
    }

    try {

      return JSON.parse(user);

    } catch (error) {

      console.error(
        'Unable to parse stored user:',
        error
      );

      return null;
    }
  }


  getUserRole(): string | null {

    const user = this.getUser();

    if (!user) {
      return null;
    }

    return (
      user.Role ||
      user.role ||
      null
    );
  }


  isAdmin(): boolean {

    return this.getUserRole() === 'Admin';
  }


  isTeamMember(): boolean {

    return this.getUserRole() === 'Team Member';
  }


  isRequester(): boolean {

    return this.getUserRole() === 'Requester';
  }


  isLoggedIn(): boolean {

    return !!this.getAccessToken();
  }


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