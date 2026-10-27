
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Observable,
  catchError,
  map,
  tap,
  timeout,
  throwError
} from 'rxjs';

import { environment } from '../../environments/environment';

export interface AIResult {
  id: number;
  organization?: number;
  ticket: number | string;
  ticket_id?: string;
  generated_for?: number;
  generated_for_id?: number;

  provider: string | null;
  model_name: string | null;
  processing_status: string;
  review_status: string;

  result: unknown;
  metadata?: Record<string, unknown> | null;
  error_message?: string | null;

  is_retested?: boolean;
  original_ai_result?: number | null;
  original_ai_result_id?: number | null;
  retest_count?: number;

  created_at: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIResultService {
  private readonly baseUrl =
    `${environment.apiUrl.replace(/\/+$/, '')}/ai/ai-results/`;

  constructor(private readonly http: HttpClient) {}

  getResults(): Observable<AIResult[]> {
    console.log('[AI Results] Request URL:', this.baseUrl);

    return this.http.get<unknown>(this.baseUrl).pipe(
      timeout(15000),

      tap(response => {
        console.log('[AI Results] Raw API response:', response);
      }),

      map(response => {
        if (Array.isArray(response)) {
          return response as AIResult[];
        }

        if (
          response !== null &&
          typeof response === 'object'
        ) {
          const data = response as Record<string, unknown>;

          if (Array.isArray(data['results'])) {
            return data['results'] as AIResult[];
          }

          if (Array.isArray(data['data'])) {
            return data['data'] as AIResult[];
          }

          if (Array.isArray(data['items'])) {
            return data['items'] as AIResult[];
          }
        }

        throw new Error(
          'Unexpected API response: an AI results array was not found.'
        );
      }),

      tap(results => {
        console.log(
          '[AI Results] Parsed records:',
          results.length
        );
      }),

      catchError((error: unknown) => {
        console.error('[AI Results] Service error:', error);

        return throwError(() => error);
      })
    );
  }

  getResult(id: number): Observable<AIResult> {
    return this.http.get<AIResult>(
      `${this.baseUrl}${id}/`
    );
  }

  retestResult(id: number): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.baseUrl}${id}/retest/`,
      {}
    );
  }
}
