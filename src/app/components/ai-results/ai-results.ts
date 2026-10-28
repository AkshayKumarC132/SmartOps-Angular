
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, take } from 'rxjs';

import {
  AIResult,
  AIResultService
} from '../../services/ai-result.service';

interface StructuredAIResult {
  summary: string;
  suggested_tags: string[];
  suggested_team: string | null;
  knowledge_base_suggestions: string[];
}

@Component({
  selector: 'app-ai-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ai-results.html',
  styleUrl: './ai-results.css'
})
export class AiResults implements OnInit {
  readonly Math = Math;

  results: AIResult[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly aiResultService: AIResultService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadResults();
  }

  /**
   * Load real AI result records from the existing Django API.
   */
  loadResults(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.markForCheck();

    this.aiResultService.getResults()
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;

          console.log('[AI Results] Loading finished:', {
            loading: this.loading,
            totalResults: this.results.length,
            completedResults: this.completedResults
          });

          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response: AIResult[]) => {
          this.results = Array.isArray(response)
            ? [...response]
            : [];

          console.log('[AI Results] Component state updated:', {
            totalResults: this.results.length,
            results: this.results,
            completedResults: this.completedResults
          });

          this.cdr.markForCheck();
        },

        error: (error: HttpErrorResponse | Error) => {
          console.error(
            '[AI Results] Failed to load results:',
            error
          );

          this.results = [];

          if (error instanceof HttpErrorResponse) {
            if (error.status === 0) {
              this.errorMessage =
                'Cannot connect to the backend. Check that Django is running and the API URL is correct.';
            } else if (error.status === 401) {
              this.errorMessage =
                'Your session has expired. Please log in again.';
            } else if (error.status === 403) {
              this.errorMessage =
                'You do not have permission to view AI results.';
            } else {
              this.errorMessage =
                error.error?.detail ||
                error.error?.message ||
                `Unable to load AI results (HTTP ${error.status}).`;
            }
          } else {
            this.errorMessage =
              error.message ||
              'Unable to load AI results. Please try again.';
          }

          this.cdr.markForCheck();
        }
      });
  }

  // --------------------------------------------------
  // Dashboard metrics
  // --------------------------------------------------

  get totalResults(): number {
    return this.results.length;
  }

  get completedResults(): number {
    return this.results.filter(
      item =>
        this.normalizeStatus(item.processing_status) ===
        'COMPLETED'
    ).length;
  }

  get pendingReviews(): number {
    return this.results.filter(item => {
      const status = this.normalizeStatus(item.review_status);

      return [
        'PENDING',
        'REVIEW_PENDING',
        'PENDING_REVIEW',
        'AWAITING_REVIEW'
      ].includes(status);
    }).length;
  }

  /**
   * Only calculates confidence when the API supplies it.
   * Does not manufacture a confidence score.
   */
  get averageConfidence(): number | null {
    const values = this.results
      .map(item => this.getConfidence(item))
      .filter((value): value is number => value !== null);

    if (values.length === 0) {
      return null;
    }

    return Math.round(
      values.reduce((sum, value) => sum + value, 0) /
      values.length
    );
  }

  /**
   * Derive result types from actual metadata or result content.
   */
  get resultTypes(): string[] {
    return Array.from(
      new Set(
        this.results.map(item => this.getResultType(item))
      )
    );
  }

  get completionRate(): number | null {
    if (this.totalResults === 0) {
      return null;
    }

    return Math.round(
      (this.completedResults / this.totalResults) * 100
    );
  }

  // --------------------------------------------------
  // Result type and confidence
  // --------------------------------------------------

  getResultType(item: AIResult): string {
    const result = this.parseResult(item.result);
    const metadata = item.metadata ?? {};

    const explicitType =
      metadata['result_type'] ??
      metadata['type'] ??
      result['result_type'] ??
      result['type'];

    if (
      typeof explicitType === 'string' &&
      explicitType.trim()
    ) {
      return this.formatStatus(explicitType);
    }

    const structured = this.getStructuredResult(item);

    if (structured.knowledge_base_suggestions.length > 0) {
      return 'KB Generation';
    }

    if (
      structured.suggested_team ||
      structured.suggested_tags.length > 0
    ) {
      return 'Routing';
    }

    if (structured.summary) {
      return 'Summary';
    }

    return 'AI Analysis';
  }

  getConfidence(item: AIResult): number | null {
    const result = this.parseResult(item.result);
    const metadata = item.metadata ?? {};

    const value =
      metadata['confidence'] ??
      metadata['confidence_score'] ??
      result['confidence'] ??
      result['confidence_score'];

    if (
      typeof value !== 'number' ||
      !Number.isFinite(value)
    ) {
      return null;
    }

    const percentage = value <= 1
      ? value * 100
      : value;

    if (percentage < 0 || percentage > 100) {
      return null;
    }

    return Math.round(percentage);
  }

  // --------------------------------------------------
  // Structured AI result data
  // --------------------------------------------------

  getStructuredResult(item: AIResult): StructuredAIResult {
    const result = this.parseResult(item.result);

    const rawTags = result['suggested_tags'];
    const rawTeam = result['suggested_team'];
    const rawSuggestions = result['knowledge_base_suggestions'];
    const rawSummary = result['summary'];

    return {
      summary:
        typeof rawSummary === 'string'
          ? rawSummary.trim()
          : '',

      suggested_tags: Array.isArray(rawTags)
        ? rawTags.filter(
            (value): value is string =>
              typeof value === 'string'
          )
        : [],

      suggested_team:
        typeof rawTeam === 'string' && rawTeam.trim()
          ? rawTeam.trim()
          : null,

      knowledge_base_suggestions:
        Array.isArray(rawSuggestions)
          ? rawSuggestions.filter(
              (value): value is string =>
                typeof value === 'string'
            )
          : []
    };
  }

  hasStructuredResult(item: AIResult): boolean {
    const result = this.getStructuredResult(item);

    return Boolean(
      result.summary ||
      result.suggested_tags.length > 0 ||
      result.suggested_team ||
      result.knowledge_base_suggestions.length > 0
    );
  }

  /**
   * Return a readable summary without rendering JSON as the
   * primary content when a structured summary is available.
   */
  getResultSummary(item: AIResult): string {
    const result = this.parseResult(item.result);

    if (
      typeof result['summary'] === 'string' &&
      result['summary'].trim()
    ) {
      return result['summary'].trim();
    }

    if (
      typeof item.result === 'string' &&
      item.result.trim()
    ) {
      return item.result.trim();
    }

    const alternativeKeys = [
      'suggestion',
      'analysis',
      'description',
      'text',
      'recommendation',
      'generated_text'
    ];

    for (const key of alternativeKeys) {
      const value = result[key];

      if (
        typeof value === 'string' &&
        value.trim()
      ) {
        return value.trim();
      }
    }

    const status = this.normalizeStatus(
      item.processing_status
    );

    if (status === 'FAILED') {
      return item.error_message ||
        'AI processing failed.';
    }

    if (
      status === 'PENDING' ||
      status === 'PROCESSING'
    ) {
      return 'AI analysis is still processing.';
    }

    if (
      item.result !== null &&
      item.result !== undefined
    ) {
      return JSON.stringify(item.result, null, 2);
    }

    return 'No generated analysis is available for this result.';
  }

  // --------------------------------------------------
  // Ticket navigation
  // --------------------------------------------------

  getTicketLabel(item: AIResult): string {
    if (
      item.ticket_id !== null &&
      item.ticket_id !== undefined &&
      String(item.ticket_id).trim()
    ) {
      return String(item.ticket_id);
    }

    return `Ticket #${item.ticket}`;
  }

  getTicketRouteId(item: AIResult): number | string {
    // Use the actual ticket primary key for navigation.
    return item.ticket;
  }

  // --------------------------------------------------
  // Provider and status formatting
  // --------------------------------------------------

  formatProvider(provider: string | null): string {
    if (!provider) {
      return 'AI model';
    }

    switch (provider.toUpperCase()) {
      case 'OPENAI':
        return 'OpenAI';

      case 'OLLAMA':
        return 'Ollama';

      default:
        return provider;
    }
  }

  formatStatus(
    status: string | null | undefined
  ): string {
    if (!status) {
      return 'Unknown';
    }

    return status
      .replace(/[_-]+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, character =>
        character.toUpperCase()
      );
  }

  getStatusClass(
    status: string | null | undefined
  ): string {
    if (!status) {
      return 'unknown';
    }

    const normalized = this.normalizeStatus(status);

    switch (normalized) {
      case 'COMPLETED':
      case 'APPROVED':
      case 'SUCCESS':
        return 'completed';

      case 'FAILED':
      case 'REJECTED':
      case 'ERROR':
        return 'failed';

      case 'PENDING':
      case 'REVIEW_PENDING':
      case 'PENDING_REVIEW':
      case 'AWAITING_REVIEW':
        return 'review-pending';

      case 'PROCESSING':
      case 'IN_PROGRESS':
        return 'processing';

      default:
        return 'unknown';
    }
  }

  // --------------------------------------------------
  // Stable list rendering
  // --------------------------------------------------

  trackByResultId(
    _index: number,
    item: AIResult
  ): number {
    return item.id;
  }

  // --------------------------------------------------
  // Request AI retest using the existing API
  // --------------------------------------------------

  retestResult(item: AIResult): void {
    const status = this.normalizeStatus(
      item.processing_status
    );

    if (
      this.loading ||
      item.is_retested ||
      item.original_ai_result_id != null ||
      !['COMPLETED', 'FAILED'].includes(status)
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Request an AI retest for ${this.getTicketLabel(item)}?`
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.aiResultService.retestResult(item.id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.successMessage =
            `Retest request submitted for ${this.getTicketLabel(item)}.`;

          this.cdr.markForCheck();
          this.loadResults();
        },

        error: (error: HttpErrorResponse) => {
          console.error('[AI Results] Retest error:', error);

          this.errorMessage =
            error.error?.detail ||
            error.error?.message ||
            error.message ||
            'Unable to submit the retest request.';

          this.cdr.markForCheck();
        }
      });
  }

  // --------------------------------------------------
  // Private helpers
  // --------------------------------------------------

  private normalizeStatus(
    status: string | null | undefined
  ): string {
    return (status || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
  }

  /**
   * Handles an object response or a JSON string response.
   */
  private parseResult(
    value: unknown
  ): Record<string, unknown> {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return value as Record<string, unknown>;
    }

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      try {
        const parsed: unknown = JSON.parse(value);

        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed)
        ) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Plain text is handled by getResultSummary().
      }
    }

    return {};
  }
}
