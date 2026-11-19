
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  catchError,
  finalize,
  forkJoin,
  of,
  take
} from 'rxjs';
import Swal from 'sweetalert2';
import {
  AIResult,
  AIResultService
} from '../../services/ai-result.service';
import { NavigationLockService } from '../../services/navigation-lock.service';
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

  // Stores confidence scores retrieved from the backend.
  confidenceByResult: Record<number, number | null> = {};

  loading = false;
  calculatingConfidence = false;
  errorMessage = '';
  successMessage = '';

  constructor(
  private readonly aiResultService: AIResultService,
  private readonly cdr: ChangeDetectorRef,
  private readonly navigationLock: NavigationLockService
) {}

  ngOnInit(): void {
    this.loadResults();
  }

  // --------------------------------------------------
  // Load AI Results
  // --------------------------------------------------

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
            completedResults: this.completedResults,
            averageConfidence: this.averageConfidence
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
          this.confidenceByResult = {};

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
                error.error?.Error ||
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
  // Calculate Confidence Scores (manual action only)
  // --------------------------------------------------

  async calculateConfidenceScores(): Promise<void> {
    if (this.loading || this.calculatingConfidence) {
      return;
    }

    const completedResults = this.results.filter(
      item => this.normalizeStatus(item.processing_status) === 'COMPLETED'
    );

    if (completedResults.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'No Completed Results',
        text: 'There are no completed AI results available for confidence calculation.',
        confirmButtonColor: '#6557e8'
      });
      return;
    }

    // Step 1: Ask for confirmation before making any confidence API calls.
    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Calculate Confidence Scores?',
      text: `Do you want to calculate confidence scores for ${completedResults.length} completed AI results?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, Calculate',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#6557e8',
      cancelButtonColor: '#64748b',
      reverseButtons: true
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    this.calculatingConfidence = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    // Step 2: Activate the existing application-wide navigation lock/waiting popup.
    this.navigationLock.begin();

    const requests = completedResults.map(item =>
      this.aiResultService.getConfidence(item.id).pipe(
        take(1),
        catchError(error => {
          console.warn(
            `[AI Results] Confidence calculation failed for result ${item.id}:`,
            error
          );
          return of(null);
        })
      )
    );

    // Each request is allowed to finish; one failed result does not stop the others.
    forkJoin(requests).pipe(take(1)).subscribe({
      next: async responses => {
        let successfulCount = 0;
        let failedCount = 0;

        responses.forEach((response, index) => {
          const item = completedResults[index];

          if (response === null) {
            failedCount++;
            return;
          }

          const scores = this.extractConfidenceScores(response);

          if (scores.length === 0) {
            failedCount++;
            return;
          }

          const average =
            scores.reduce((sum, value) => sum + value, 0) / scores.length;

          this.confidenceByResult[item.id] =
            Math.round(average * 100) / 100;

          successfulCount++;
        });

        this.cdr.markForCheck();

        // Step 3: Close the waiting popup/lock before showing the final popup.
        // The SweetAlert success/warning modal prevents page interaction until OK.
        this.navigationLock.end();

        try {
          await Swal.fire({
            icon: failedCount === 0 ? 'success' : 'warning',
            title: failedCount === 0
              ? 'Confidence Calculation Completed!'
              : 'Calculation Partially Completed',
            text: failedCount === 0
              ? `Confidence scores successfully calculated for ${successfulCount} AI results.`
              : `Successfully calculated ${successfulCount} of ${completedResults.length} results. ${failedCount} results could not be calculated.`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#6557e8',
            allowOutsideClick: false,
            allowEscapeKey: false
          });
        } finally {
          // Step 4: Re-enable the Calculate button only after the final popup is dismissed.
          this.calculatingConfidence = false;
          this.cdr.markForCheck();
        }
      },
      error: async error => {
        console.error('[AI Results] Confidence calculation error:', error);
        this.navigationLock.end();

        try {
          await Swal.fire({
            icon: 'error',
            title: 'Calculation Failed',
            text: 'Unable to complete confidence score calculation.',
            confirmButtonColor: '#6557e8',
            allowOutsideClick: false,
            allowEscapeKey: false
          });
        } finally {
          this.calculatingConfidence = false;
          this.cdr.markForCheck();
        }
      }
    });
  }

  // --------------------------------------------------
  // Parse Confidence API Response
  // --------------------------------------------------

  private extractConfidenceScores(response: unknown): number[] {
    if (
      response === null ||
      typeof response !== 'object' ||
      Array.isArray(response)
    ) {
      return [];
    }

    const data = response as Record<string, unknown>;
    const confidenceResults = data['confidence_results'];

    if (
      confidenceResults === null ||
      typeof confidenceResults !== 'object' ||
      Array.isArray(confidenceResults)
    ) {
      return [];
    }

    const confidence =
      confidenceResults as Record<string, unknown>;

    const scores: number[] = [];

    const addScore = (value: unknown): void => {
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value)
      ) {
        return;
      }

      const percentage = value <= 1
        ? value * 100
        : value;

      if (percentage >= 0 && percentage <= 100) {
        scores.push(percentage);
      }
    };

    const addArrayScores = (value: unknown): void => {
      if (!Array.isArray(value)) {
        return;
      }

      value.forEach(entry => {
        if (
          entry !== null &&
          typeof entry === 'object' &&
          !Array.isArray(entry)
        ) {
          const record = entry as Record<string, unknown>;

          addScore(record['confidence_score']);
        }
      });
    };

    // Knowledge-base suggestion confidence.
    addArrayScores(confidence['knowledge_base']);

    // Suggested tag confidence.
    addArrayScores(confidence['tags']);

    // Suggested team confidence.
    const team = confidence['team'];

    if (
      team !== null &&
      typeof team === 'object' &&
      !Array.isArray(team)
    ) {
      const teamRecord = team as Record<string, unknown>;

      addScore(teamRecord['confidence_score']);
    }

    return scores;
  }

  // --------------------------------------------------
  // Dashboard Metrics
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
   * Calculates average confidence from actual API data.
   * Results without confidence scores are excluded.
   */
  
get averageConfidence(): number | null {
  const values = this.results
    .map(item => this.getConfidence(item))
    .filter((value): value is number =>
      value !== null && Number.isFinite(value)
    );

  if (values.length === 0) {
    return null;
  }

  const average =
    values.reduce((sum, value) => sum + value, 0) /
    values.length;

  return Math.round(average * 100) / 100;
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
  // Result Type and Confidence
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
      return this.confidenceByResult[item.id] ?? null;
    }

    const percentage = value <= 1
      ? value * 100
      : value;

    if (percentage < 0 || percentage > 100) {
      return this.confidenceByResult[item.id] ?? null;
    }

    return Math.round(percentage);
  }

  // --------------------------------------------------
  // Structured AI Result Data
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

  // --------------------------------------------------
  // Result Summary
  // --------------------------------------------------

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
  // Ticket Navigation
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
  // Provider and Status Formatting
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
  // Stable List Rendering
  // --------------------------------------------------

  trackByResultId(
    _index: number,
    item: AIResult
  ): number {
    return item.id;
  }

  // --------------------------------------------------
  // Request AI Retest
  // --------------------------------------------------

  async retestResult(item: AIResult): Promise<void> {
    const status = this.normalizeStatus(item.processing_status);

    if (
      this.loading ||
      item.is_retested ||
      item.original_ai_result_id != null ||
      !['COMPLETED', 'FAILED'].includes(status)
    ) {
      return;
    }

    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Request AI retest?',
      text: `Request an AI retest for ${this.getTicketLabel(item)}?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, retest',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#6557e8',
      cancelButtonColor: '#64748b',
      reverseButtons: true
    });

    if (!confirmation.isConfirmed) {
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

          void Swal.fire({
            icon: 'success',
            title: 'Retest requested',
            text: this.successMessage,
            confirmButtonColor: '#6557e8'
          });

          this.loadResults();
        },

        error: (error: HttpErrorResponse) => {
          console.error('[AI Results] Retest error:', error);

          this.errorMessage =
            error.error?.Error ||
            error.error?.detail ||
            error.error?.message ||
            error.message ||
            'Unable to submit the retest request.';

          this.cdr.markForCheck();

          void Swal.fire({
            icon: 'error',
            title: 'Retest failed',
            text: this.errorMessage,
            confirmButtonColor: '#6557e8'
          });
        }
      });
  }

  // --------------------------------------------------
  // Private Helpers
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
