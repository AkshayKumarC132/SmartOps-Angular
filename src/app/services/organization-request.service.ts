
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrganizationRequestService {

  private readonly apiUrl =
    `${environment.apiUrl.replace(/\/+$/, '')}/request-organization/`;

  constructor(private readonly http: HttpClient) {}

  // ============================================
  // SUBMIT ORGANIZATION REQUEST
  // ============================================

  submitRequest(data: {
    organization_name: string;
    explanation: string;
  }): Observable<any> {

    return this.http.post<any>(
      this.apiUrl,
      data
    );
  }

  // ============================================
  // GET CURRENT USER'S ORGANIZATION REQUESTS
  // ============================================

  getMyRequests(): Observable<any> {

    return this.http.get<any>(
      `${environment.apiUrl.replace(/\/+$/, '')}/see-my-organization-requests/`
    );
  }
}
