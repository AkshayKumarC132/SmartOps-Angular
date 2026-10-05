import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role: string;
  is_ai_enabled?: boolean;
  ai_provider_config?: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl =
    `${environment.apiUrl}/auth/users/`;


  constructor(
    private http: HttpClient
  ) {}


  // =========================================================
  // GET ALL USERS
  // =========================================================

  getUsers(): Observable<User[]> {

    const url = this.apiUrl;

    console.log(
      'User Management API URL:',
      url
    );

    return this.http.get<User[]>(url);
  }


  // =========================================================
  // GET USER
  // =========================================================

  getUser(
    id: number
  ): Observable<User> {

    return this.http.get<User>(
      `${this.apiUrl}${id}/`
    );
  }


  // =========================================================
  // UPDATE USER
  // =========================================================

  updateUser(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.patch(
      `${this.apiUrl}${id}/`,
      data
    );
  }


  // =========================================================
  // DELETE / DEACTIVATE USER
  // =========================================================

  deleteUser(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}${id}/`
    );
  }


  // =========================================================
  // REGISTER USER
  // =========================================================

  registerUser(
    data: any
  ): Observable<any> {

    return this.http.post(
      `${environment.apiUrl}/auth/register/`,
      data
    );
  }


  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  changePassword(
    data: ChangePasswordData
  ): Observable<any> {

    return this.http.post(
      `${environment.apiUrl}/auth/change-password/`,
      data
    );
  }

}