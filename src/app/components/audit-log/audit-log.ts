
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ApiErrorService } from '../../services/api-error.service';

interface AuditActivity {
  id: number;
  ticket: string | number | null;
  ticket_identifier?: string | null;
  performed_by: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string;
  result: string | null;
  created_at: string;
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-log.html',
  styleUrl: './audit-log.css'
})
export class AuditLog implements OnInit {
  activities: AuditActivity[] = [];
  loading = true;
  errorMessage = '';
  refreshing = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private apiErrorService: ApiErrorService
  ) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  // LOAD AUDIT LOGS
  loadAuditLogs(showInitialLoader = true): void {
    // Prevent duplicate requests while a load or refresh is already running.
    if (this.refreshing) {
      return;
    }

    this.refreshing = true;

    if (showInitialLoader) {
      this.loading = true;
    }

    // Clear a previous error when a new request starts.
    this.errorMessage = '';

    const startedAt = performance.now();
    console.info('[Audit Log] Request started');

    this.http.get<AuditActivity[]>(
      `${environment.apiUrl}/tickets-activity/`
    ).subscribe({
      next: (response) => {
        this.activities = Array.isArray(response)
          ? response
          : [];

        this.loading = false;
        this.refreshing = false;

        const duration = Math.round(performance.now() - startedAt);
        console.info(
          `[Audit Log] Loaded ${this.activities.length} records in ${duration} ms`
        );

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('[Audit Log] Request failed:', error);

        const duration = Math.round(performance.now() - startedAt);
        console.warn(`[Audit Log] Failed after ${duration} ms`);

        // Keep previously loaded records visible when a refresh fails.
        this.loading = false;
        this.refreshing = false;

        if (error.status === 401) {
          this.errorMessage =
            'Authentication failed. Please login again.';
        } else if (error.status === 403) {
          this.errorMessage =
            'You do not have permission to view the audit log.';
        } else if (error.status === 0) {
          this.errorMessage =
            'Unable to connect to the backend server.';
        } else {
          this.errorMessage =
            this.apiErrorService.getErrorMessage(error) ||
            'Unable to load audit log.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  // NORMALIZE EVENT ACTION
  private normalizeAction(action: string | null | undefined): string {
    return String(action || '')
      .replace(/[()'",]/g, '')
      .trim()
      .toUpperCase();
  }

  // EVENT NAME
  formatEvent(action: string): string {
    const cleanAction = this.normalizeAction(action);

    if (!cleanAction) {
      return 'Activity';
    }

    switch (cleanAction) {
      case 'CREATED':
        return 'Created';

      case 'ASSIGNED':
        return 'Assignment';

      case 'STATUS_CHANGED':
        return 'Status Change';

      case 'ATTACHMENT_ADDED':
        return 'Attachment Added';

      case 'ATTACHMENT_DELETED':
        return 'Attachment Deleted';

      case 'TAG_ADDED':
        return 'Tag Added';

      case 'TAG_REMOVED':
        return 'Tag Removed';

      case 'DELETED':
        return 'Deleted';

      case 'ACCESS_DENIED':
        return 'Access Denied';

      case 'KB_GENERATED':
        return 'Kb Generated';

      case 'COMMENT_ADDED':
        return 'Comment Added';

      case 'UPDATED':
        return 'Updated';

      default:
        return cleanAction
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, char => char.toUpperCase());
    }
  }

  // EVENT CSS CLASS
  getEventClass(action: string): string {
    switch (this.normalizeAction(action)) {
      case 'STATUS_CHANGED':
        return 'event-status';

      case 'ATTACHMENT_ADDED':
      case 'ATTACHMENT_DELETED':
        return 'event-attachment';

      case 'ASSIGNED':
        return 'event-assignment';

      case 'CREATED':
        return 'event-created';

      case 'KB_GENERATED':
        return 'event-kb';

      case 'COMMENT_ADDED':
        return 'event-comment';

      case 'DELETED':
        return 'event-deleted';

      case 'ACCESS_DENIED':
        return 'event-denied';

      default:
        return 'event-default';
    }
  }

  // DISPLAY TICKET IDENTIFIER
  getTicket(activity: AuditActivity): string {
    const ticket = activity.ticket_identifier || activity.ticket;

    return ticket !== null &&
      ticket !== undefined &&
      String(ticket).trim() !== ''
      ? String(ticket)
      : '-';
  }

  // EXTRACT NUMERIC TICKET ID FOR ROUTING
  getTicketId(activity: AuditActivity): number | null {
    const ticket = activity.ticket;

    if (typeof ticket === 'number') {
      return Number.isSafeInteger(ticket) && ticket > 0
        ? ticket
        : null;
    }

    if (typeof ticket !== 'string' || !ticket.trim()) {
      return null;
    }

    const match = ticket.trim().match(/(\d+)$/);

    if (!match) {
      return null;
    }

    const ticketId = Number(match[1]);

    return Number.isSafeInteger(ticketId) && ticketId > 0
      ? ticketId
      : null;
  }

  // OPEN TICKET USING ANGULAR ROUTER
  openTicket(activity: AuditActivity): void {
    const ticketId = this.getTicketId(activity);

    if (ticketId === null) {
      console.warn(
        'Cannot navigate: invalid ticket identifier.',
        activity.ticket
      );
      return;
    }

    void this.router.navigate(['/ticket', ticketId]);
  }

  // ACTOR
  getActor(activity: AuditActivity): string {
    return activity.performed_by?.trim() || 'System';
  }

  // ACTOR INITIAL
  getActorInitial(activity: AuditActivity): string {
    const actor = this.getActor(activity).trim();

    return actor ? actor.charAt(0).toUpperCase() : '?';
  }

  // DETAILED AUDIT INFORMATION
  getDetails(activity: AuditActivity): string {
    const details: string[] = [];
    const field = activity.field?.trim();
    const oldValue = activity.old_value?.trim();
    const newValue = activity.new_value?.trim();
    const description = activity.description?.trim();

    if (field) {
      details.push(`Field: ${field}`);
    }

    if (oldValue || newValue) {
      details.push(`${oldValue || '—'} → ${newValue || '—'}`);
    }

    if (description) {
      details.push(description);
    }

    return details.length > 0 ? details.join(' | ') : '—';
  }

  // RESULT CSS CLASS
  getResultClass(result: string | null | undefined): string {
    const status = String(result || '').trim().toUpperCase();

    switch (status) {
      case 'SUCCESS':
        return 'result-success';
      case 'DENIED':
      case 'ACCESS_DENIED':
        return 'result-denied';
      case 'FAILED':
      case 'ERROR':
        return 'result-failed';
      default:
        return 'result-default';
    }
  }

  // FORMAT RESULT LABEL
  formatResult(result: string | null | undefined): string {
    const status = String(result || '').trim().toUpperCase();

    if (!status) {
      return 'Unknown';
    }

    switch (status) {
      case 'SUCCESS':
        return 'Success';
      case 'DENIED':
      case 'ACCESS_DENIED':
        return 'Denied';
      case 'FAILED':
        return 'Failed';
      case 'ERROR':
        return 'Error';
      default:
        return status
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, char => char.toUpperCase());
    }
  }

  // DATE FORMATTING
  formatDate(date: string): string {
    if (!date) {
      return '-';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return '-';
    }

    return parsedDate.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // REFRESH WITHOUT HIDING THE CURRENT TABLE
  refresh(): void {
    if (this.loading || this.refreshing) {
      return;
    }

    // loadAuditLogs() sets refreshing itself; do not set it before this call.
    this.loadAuditLogs(false);
  }
}
