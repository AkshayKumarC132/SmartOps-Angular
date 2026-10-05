import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';

interface AuditActivity {
  id: number;

  ticket: string | null;

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }


  // =========================================================
  // LOAD AUDIT LOGS
  // =========================================================

  loadAuditLogs(): void {

    this.loading = true;

    this.errorMessage = '';

    this.http.get<AuditActivity[]>(
      `${environment.apiUrl}/tickets-activity/`
    ).subscribe({

      next: (response) => {

        console.log('Audit Log API Response:', response);

        this.activities = Array.isArray(response)
          ? response
          : [];

        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Unable to load audit logs:',
          error
        );

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
            'Unable to load audit log.';
        }

        this.cdr.detectChanges();
      }
    });
  }


  // =========================================================
  // EVENT NAME
  // =========================================================

  formatEvent(action: string): string {

    if (!action) {
      return 'Activity';
    }

    const cleanAction = String(action)
      .replace(/[()'",]/g, '')
      .trim()
      .toUpperCase();

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
          .replace(/\b\w/g, char =>
            char.toUpperCase()
          );
    }
  }


  // =========================================================
  // EVENT CSS CLASS
  // =========================================================

  getEventClass(action: string): string {

    if (!action) {
      return 'event-default';
    }

    const cleanAction = String(action)
      .replace(/[()'",]/g, '')
      .trim()
      .toUpperCase();

    switch (cleanAction) {

      case 'STATUS_CHANGED':
        return 'event-status';

      case 'ATTACHMENT_ADDED':
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


  // =========================================================
  // TICKET NUMBER
  // =========================================================

  getTicket(activity: AuditActivity): string {

    return (
      activity.ticket ||
      activity.ticket_identifier ||
      '-'
    );
  }


  // =========================================================
  // ACTOR
  // =========================================================

  getActor(activity: AuditActivity): string {

    return activity.performed_by || 'System';
  }


  // =========================================================
  // ACTOR INITIAL
  // =========================================================

  getActorInitial(activity: AuditActivity): string {

    const actor = this.getActor(activity);

    if (!actor) {
      return '?';
    }

    return actor
      .trim()
      .charAt(0)
      .toUpperCase();
  }


  // =========================================================
  // DETAILS
  // =========================================================

  getDetails(activity: AuditActivity): string {

    /*
     * For status changes, show:
     *
     * RESOLVED → REOPENED
     */

    const cleanAction = String(activity.action || '')
      .replace(/[()'",]/g, '')
      .trim()
      .toUpperCase();

    if (
      cleanAction === 'STATUS_CHANGED' &&
      activity.old_value &&
      activity.new_value
    ) {

      return `${activity.old_value} → ${activity.new_value}`;
    }


    /*
     * Assignment
     */

    if (
      cleanAction === 'ASSIGNED' &&
      activity.new_value
    ) {

      return activity.new_value;
    }


    /*
     * Attachment
     */

    if (
      cleanAction === 'ATTACHMENT_ADDED' &&
      activity.new_value
    ) {

      return activity.new_value;
    }


    /*
     * Generic activity
     */

    if (activity.description) {

      return activity.description;
    }


    return '—';
  }


  // =========================================================
  // DATE
  // =========================================================

  formatDate(date: string): string {

    if (!date) {
      return '-';
    }

    return new Date(date).toLocaleString(
      'en-US',
      {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      }
    );
  }


  // =========================================================
  // REFRESH
  // =========================================================

  refresh(): void {

    this.loadAuditLogs();
  }

}