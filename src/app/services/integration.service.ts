import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {

  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ================================
  // EMAIL ENDPOINTS
  // ================================

  getEmailEndpoints(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/email-endpoints/`
    );
  }

  createEmailEndpoint(data: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/email-endpoints/`,
      data
    );
  }

  updateEmailEndpoint(
    id: number,
    data: any
  ): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/email-endpoints/${id}/`,
      data
    );
  }

  deleteEmailEndpoint(id: number): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/email-endpoints/${id}/`
    );
  }

  // ================================
  // EMAIL DELIVERIES
  // ================================

  getEmailDeliveries(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/email-deliveries/`
    );
  }

  retryEmailDelivery(id: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/email-deliveries/${id}/retry/`,
      {}
    );
  }

  // ================================
  // WEBHOOK ENDPOINTS
  // ================================

  getWebhookEndpoints(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/webhook-endpoints/`
    );
  }

  createWebhookEndpoint(data: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/webhook-endpoints/`,
      data
    );
  }

  updateWebhookEndpoint(
    id: number,
    data: any
  ): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/webhook-endpoints/${id}/`,
      data
    );
  }

  deleteWebhookEndpoint(id: number): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/webhook-endpoints/${id}/`
    );
  }

  // ================================
  // WEBHOOK DELIVERIES
  // ================================

  getWebhookDeliveries(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/webhook-deliveries/`
    );
  }

  retryWebhookDelivery(id: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/webhook-deliveries/${id}/retry/`,
      {}
    );
  }

}