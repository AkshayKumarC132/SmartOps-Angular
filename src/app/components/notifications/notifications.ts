import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import {
  NotificationItem,
  NotificationService
} from '../../services/notifications.service';

import { ApiErrorService } from '../../services/api-error.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications implements OnInit {
  notifications: NotificationItem[] = [];
  loading = true;
  errorMessage = '';
  selectedFilter = 'All';
  selectedType = 'All';

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private apiErrorService: ApiErrorService
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================

  loadNotifications(): void {
    this.loading = true;
    this.errorMessage = '';

    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = Array.isArray(notifications)
          ? notifications
          : [];

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Unable to load notifications:', error);

        this.notifications = [];
        this.loading = false;

        if (error.status === 401) {
          this.errorMessage =
            'Authentication failed. Please login again.';
        } else if (error.status === 403) {
          this.errorMessage =
            'You do not have permission to view notifications.';
        } else if (error.status === 0) {
          this.errorMessage =
            'Unable to connect to the backend server.';
        } else {
          this.errorMessage =
            this.apiErrorService.getErrorMessage(error) ||
            'Unable to load notifications.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================
  // UNREAD COUNT
  // =========================================================

  get unreadCount(): number {
    return this.notifications.filter(
      notification => !notification.read
    ).length;
  }

  // =========================================================
  // FILTERED NOTIFICATIONS
  // =========================================================

  get filteredNotifications(): NotificationItem[] {
    let result = [...this.notifications];

    if (this.selectedFilter === 'Unread') {
      result = result.filter(
        notification => !notification.read
      );
    }

    if (this.selectedType !== 'All') {
      result = result.filter(
        notification =>
          this.getDisplayEvent(notification.action) ===
          this.selectedType
      );
    }

    return result;
  }

  // =========================================================
  // EVENT LABEL
  // =========================================================

  getDisplayEvent(action: string): string {
    const normalizedAction = String(action || '')
      .replace(/[()'",]/g, '')
      .trim()
      .toUpperCase();

    switch (normalizedAction) {
      case 'STATUS_CHANGED':
        return 'Status Change';

      case 'ASSIGNED':
        return 'Assignment';

      case 'ATTACHMENT_ADDED':
      case 'ATTACHMENT_DELETED':
        return 'Attachment Added';

      case 'CREATED':
        return 'Created';

      case 'COMMENT_ADDED':
        return 'Comment Added';

      case 'KB_GENERATED':
        return 'Kb Generated';

      default:
        return 'Other';
    }
  }

  // =========================================================
  // NOTIFICATION ICON
  // =========================================================

  getNotificationIcon(notification: NotificationItem): string {
    const action = String(notification.action || '')
      .replace(/[()'",]/g, '')
      .trim()
      .toUpperCase();

    if (action === 'STATUS_CHANGED') {
      return 'status';
    }

    if (action === 'ASSIGNED') {
      return 'assignment';
    }

    if (
      action === 'ATTACHMENT_ADDED' ||
      action === 'ATTACHMENT_DELETED'
    ) {
      return 'attachment';
    }

    if (action === 'CREATED') {
      return 'created';
    }

    return 'default';
  }

  // =========================================================
  // DATE FORMATTING
  // =========================================================

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
      minute: '2-digit'
    });
  }

  // =========================================================
  // EXTRACT DATABASE TICKET ID
  // =========================================================

  private getTicketId(ticket: unknown): number | null {
    if (typeof ticket === 'number') {
      return Number.isInteger(ticket) && ticket > 0
        ? ticket
        : null;
    }

    if (typeof ticket !== 'string') {
      return null;
    }

    const normalizedTicket = ticket.trim();

    if (!normalizedTicket) {
      return null;
    }

    // Supports identifiers such as "8", "TKT-008" and "TICKET-123".
    const match = normalizedTicket.match(/(\d+)$/);

    if (!match) {
      return null;
    }

    const ticketId = Number(match[1]);

    return Number.isSafeInteger(ticketId) && ticketId > 0
      ? ticketId
      : null;
  }

  // =========================================================
  // OPEN NOTIFICATION
  // Clicking the notification card can open its ticket.
  // =========================================================

  openNotification(notification: NotificationItem): void {
    this.markAsRead(notification);

    if (!notification.ticket) {
      return;
    }

    const ticketId = this.getTicketId(notification.ticket);

    if (ticketId === null) {
      console.error(
        'Invalid ticket identifier:',
        notification.ticket
      );

      void Swal.fire({
        icon: 'warning',
        title: 'Ticket unavailable',
        text: 'This notification does not contain a valid ticket ID.',
        confirmButtonText: 'OK'
      });

      return;
    }

    void this.router.navigate(['/ticket', ticketId]);
  }

  // =========================================================
  // MARK ONE NOTIFICATION AS READ
  // Does not navigate to the ticket.
  // =========================================================

  markAsRead(notification: NotificationItem): void {
    if (notification.read) {
      return;
    }

    this.notificationService.markAsRead(notification.id);
    notification.read = true;

    this.cdr.detectChanges();
  }

  // =========================================================
  // MARK ALL NOTIFICATIONS AS READ
  // =========================================================

  async markAllRead(): Promise<void> {
    if (this.unreadCount === 0) {
      return;
    }

    const result = await Swal.fire({
      title: 'Mark all as read?',
      text: 'All notifications will be marked as read.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, mark all read',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      // Keep the existing service method and API contract.
      this.notificationService.markAllAsRead(this.notifications);

      this.notifications = this.notifications.map(
        notification => ({
          ...notification,
          read: true
        })
      );

      this.cdr.detectChanges();

      // This confirms the local UI update. The service's existing
      // method determines how the server request is handled.
      await Swal.fire({
        icon: 'success',
        title: 'Notifications updated',
        text: 'All notifications are now marked as read in this view.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Unable to mark all notifications as read:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Update failed',
        text: 'Unable to mark all notifications as read. Please try again.',
        confirmButtonText: 'OK'
      });

      this.loadNotifications();
    }
  }

  // =========================================================
  // FILTER CONTROLS
  // =========================================================

  setFilter(filter: string): void {
    this.selectedFilter = filter;
  }

  setType(type: string): void {
    this.selectedType = type;
  }

  // =========================================================
  // REFRESH
  // =========================================================

  refresh(): void {
    this.loadNotifications();
  }
}