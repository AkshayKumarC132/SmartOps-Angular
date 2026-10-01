import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient
  ) {}

  getEmailEndpoints(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/email-endpoints/`
    );
  }

  createEmailEndpoint(
    data: any
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/email-endpoints/`,
      data
    );
  }

  getEmailDeliveries(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/email-deliveries/`
    );
  }

  getWebhookEndpoints(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/webhook-endpoints/`
    );
  }

  createWebhookEndpoint(
    data: any
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/webhook-endpoints/`,
      data
    );
  }

  getWebhookDeliveries(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/webhook-deliveries/`
    );
  }
}