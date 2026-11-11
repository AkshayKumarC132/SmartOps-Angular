
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';

// ========================================
// SLA CONFIGURATION INTERFACE
// ========================================
export type SLAPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export interface SLAConfiguration {
  id: number;
  organization: number;
  team: number;
  priority: SLAPriority;
  response_time: string;
  resolution_time: string;
  created_at: string;
  updated_at: string;
}

// ========================================
// API RESPONSE INTERFACE
// ========================================

interface SLAListResponse {
  message: string;
  data: SLAConfiguration[];
}

interface SLADetailResponse {
  message: string;
  data: SLAConfiguration;
}

// ========================================
// SLA SERVICE
// ========================================

@Injectable({
  providedIn: 'root'
})
export class SLAService {

  private readonly baseUrl =
    `${environment.apiUrl.replace(/\/+$/, '')}/sla/configurations/`;

  constructor(
    private readonly http: HttpClient
  ) {}

  // ========================================
  // GET ALL SLA CONFIGURATIONS
  // ========================================

  getConfigurations(): Observable<SLAConfiguration[]> {

    return this.http.get<SLAListResponse>(
      this.baseUrl
    ).pipe(
      map(response => {

        if (!response || !Array.isArray(response.data)) {
          throw new Error(
            'Invalid SLA configuration response from server.'
          );
        }

        return response.data;
      })
    );
  }

  // ========================================
  // GET SINGLE SLA CONFIGURATION
  // ========================================

  getConfiguration(id: number): Observable<SLAConfiguration> {

    return this.http.get<SLADetailResponse>(
      `${this.baseUrl}${id}/`
    ).pipe(
      map(response => response.data)
    );
  }

  // ========================================
  // CREATE SLA CONFIGURATION
  // ========================================

  createConfiguration(
    data: {
      team: number;
      priority: SLAConfiguration['priority'];
      response_time: string;
      resolution_time: string;
    }
  ): Observable<SLADetailResponse> {

    return this.http.post<SLADetailResponse>(
      this.baseUrl,
      data
    );
  }

  // ========================================
  // UPDATE SLA CONFIGURATION
  // ========================================

  updateConfiguration(
    id: number,
    data: {
      team: number;
      priority: SLAConfiguration['priority'];
      response_time: string;
      resolution_time: string;
    }
  ): Observable<SLADetailResponse> {

    return this.http.put<SLADetailResponse>(
      `${this.baseUrl}${id}/`,
      data
    );
  }

  // ========================================
  // DELETE SLA CONFIGURATION
  // ========================================

  deleteConfiguration(
    id: number
  ): Observable<{ message: string }> {

    return this.http.delete<{ message: string }>(
      `${this.baseUrl}${id}/`
    );
  }

  // ========================================
  // CONVERT USER DURATION TO API FORMAT
  // Example: 30m -> PT30M
  //          2h   -> PT2H
  //          1d   -> P1D
  // ========================================

  toApiDuration(value: string): string {

    const normalized = value.trim().toLowerCase();

    const matches = [
      ...normalized.matchAll(/(\d+)\s*(d|h|m|s)/g)
    ];

    if (!matches.length) {
      throw new Error(
        'Enter a valid duration, such as 30m, 2h, or 1d.'
      );
    }

    const remaining = normalized.replace(
      /(\d+)\s*(d|h|m|s)/g,
      ''
    ).replace(/[\s,]+/g, '');

    if (remaining) {
      throw new Error(
        'Invalid duration. Use days, hours, minutes, or seconds.'
      );
    }

    let days = 0;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    for (const match of matches) {

      const amount = Number(match[1]);
      const unit = match[2];

      if (amount <= 0) {
        throw new Error(
          'Duration values must be greater than zero.'
        );
      }

      switch (unit) {
        case 'd':
          days += amount;
          break;

        case 'h':
          hours += amount;
          break;

        case 'm':
          minutes += amount;
          break;

        case 's':
          seconds += amount;
          break;
      }
    }

    const datePart = days > 0
      ? `${days}D`
      : '';

    const timePart = [
      hours > 0 ? `${hours}H` : '',
      minutes > 0 ? `${minutes}M` : '',
      seconds > 0 ? `${seconds}S` : ''
    ].join('');

    if (!datePart && !timePart) {
      throw new Error(
        'Duration must be greater than zero.'
      );
    }

    return `P${datePart}${timePart ? `T${timePart}` : ''}`;
  }

  // ========================================
  // CONVERT API DURATION TO DISPLAY FORMAT
  // ========================================

  formatDuration(value: string): string {

    if (!value) {
      return 'N/A';
    }

    // Handle ISO-8601 duration.
    const isoMatch = value.match(
      /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
    );

    if (isoMatch) {

      const parts: string[] = [];

      if (isoMatch[1]) {
        parts.push(`${isoMatch[1]}d`);
      }

      if (isoMatch[2]) {
        parts.push(`${isoMatch[2]}h`);
      }

      if (isoMatch[3]) {
        parts.push(`${isoMatch[3]}m`);
      }

      if (isoMatch[4]) {
        parts.push(`${isoMatch[4]}s`);
      }

      return parts.join(' ') || '0s';
    }

    // Handle Django duration format:
    // HH:MM:SS or D HH:MM:SS

    const djangoMatch = value.match(
      /^(?:(\d+)\s+days?,?\s+)?(?:(\d+)\s+)?(\d{1,2}):(\d{2}):(\d{2})$/
    );

    if (djangoMatch) {

      const days = Number(djangoMatch[1] || 0);
      const hours = Number(djangoMatch[2] || 0) +
        days * 24;
      const minutes = Number(djangoMatch[4]);
      const seconds = Number(djangoMatch[5]);

      const parts: string[] = [];

      if (hours) {
        parts.push(`${hours}h`);
      }

      if (minutes) {
        parts.push(`${minutes}m`);
      }

      if (seconds) {
        parts.push(`${seconds}s`);
      }

      return parts.join(' ') || '0s';
    }

    // Return original API value if its format is unfamiliar.
    return value;
  }
}
