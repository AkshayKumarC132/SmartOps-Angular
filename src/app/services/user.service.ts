
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/* ============================================================
   USER INTERFACES
   ============================================================ */

export interface NotificationPreferences {
  email?: boolean;
  in_app?: boolean;
  [key: string]: any;
}

export interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role: string;
  is_ai_enabled?: boolean;
  ai_provider_config?: any;
  notification_preferences?: NotificationPreferences;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type RegistrationRole = 'Requester' | 'Team Member';

/* ============================================================
   USER SERVICE
   ============================================================ */

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly apiUrl =
    `${environment.apiUrl}/auth/users/`;

  private readonly registerUrl =
    `${environment.apiUrl}/auth/register/`;

  constructor(private http: HttpClient) {}

  /* ============================================================
     GET ALL USERS
     ============================================================ */

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  /* ============================================================
     GET USER BY ID
     ============================================================ */

  getUser(id: number): Observable<User> {
    return this.http.get<User>(
      `${this.apiUrl}${id}/`
    );
  }

  /* ============================================================
     CREATE USER
     Uses POST /auth/register/
     ============================================================ */

  registerUser(data: {
    username: string;
    email: string;
    password: string;
    role: RegistrationRole;
    first_name?: string;
    last_name?: string;
  }): Observable<any> {

    const payload = {
      username: data.username.trim(),
      email: data.email.trim(),
      password: data.password,
      role: data.role,
      first_name: data.first_name?.trim() || '',
      last_name: data.last_name?.trim() || ''
    };

    return this.http.post<any>(
      this.registerUrl,
      payload
    );
  }

  /* ============================================================
     UPDATE USER
     ============================================================ */

  updateUser(
    id: number,
    data: Partial<User> & { password?: string }
  ): Observable<User> {
    return this.http.patch<User>(
      `${this.apiUrl}${id}/`,
      data
    );
  }

  /* ============================================================
     DELETE USER
     Sends DELETE /auth/users/<id>/
     ============================================================ */

  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}${id}/`
    );
  }

  /* ============================================================
     CHANGE PASSWORD
     ============================================================ */

  changePassword(data: {
    old_password: string;
    new_password: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/auth/change-password/`,
      {
        old_password: data.old_password,
        new_password: data.new_password
      }
    );
  }
}
