
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
  result: string;
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
  loadAuditLogs(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<AuditActivity[]>(
      `${environment.apiUrl}/tickets-activity/`
    ).subscribe({
      next: (response) => {
        this.activities = Array.isArray(response)
          ? response
          : [];

        this.loading = false;
        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Unable to load audit logs:', error);

        this.activities = [];
        this.loading = false;

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

  // DETAILS
  getDetails(activity: AuditActivity): string {
    const action = this.normalizeAction(activity.action);

    if (
      action === 'STATUS_CHANGED' &&
      activity.old_value &&
      activity.new_value
    ) {
      return `${activity.old_value} → ${activity.new_value}`;
    }

    if (action === 'ASSIGNED' && activity.new_value) {
      return activity.new_value;
    }

    if (
      (action === 'ATTACHMENT_ADDED' ||
        action === 'ATTACHMENT_DELETED') &&
      activity.new_value
    ) {
      return activity.new_value;
    }

    if (activity.description?.trim()) {
      return activity.description.trim();
    }

    if (activity.field?.trim()) {
      return activity.field.trim();
    }

    return '—';
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

  // REFRESH
  refresh(): void {
    if (!this.loading) {
      this.loadAuditLogs();
    }
  }
}
