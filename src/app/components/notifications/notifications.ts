import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  NotificationItem,
  NotificationService
} from '../../services/notifications.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule
  ],
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
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {

    this.loadNotifications();
  }


  // =========================================================
  // LOAD
  // =========================================================

  loadNotifications(): void {

    this.loading = true;

    this.errorMessage = '';

    this.notificationService
      .getNotifications()
      .subscribe({

        next: (notifications) => {

          this.notifications =
            notifications;

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Unable to load notifications:',
            error
          );

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

  get filteredNotifications():
    NotificationItem[] {

    let result =
      [...this.notifications];


    // Read filter

    if (this.selectedFilter === 'Unread') {

      result =
        result.filter(
          notification =>
            !notification.read
        );

    }


    // Event filter

    if (
      this.selectedType !== 'All'
    ) {

      result =
        result.filter(
          notification =>
            this.getDisplayEvent(
              notification.action
            ) === this.selectedType
        );
    }


    return result;
  }


  // =========================================================
  // DISPLAY EVENT
  // =========================================================

  getDisplayEvent(
    action: string
  ): string {

    switch (
      String(action || '')
        .replace(/[()'",]/g, '')
        .trim()
        .toUpperCase()
    ) {

      case 'STATUS_CHANGED':
        return 'Status Change';

      case 'ASSIGNED':
        return 'Assignment';

      case 'ATTACHMENT_ADDED':
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
  // ICON
  // =========================================================

  getNotificationIcon(
    notification: NotificationItem
  ): string {

    const action =
      String(notification.action || '')
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
  // DATE
  // =========================================================

  formatDate(
    date: string
  ): string {

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
        minute: '2-digit'
      }
    );
  }


  // =========================================================
  // OPEN TICKET
  // =========================================================

  openNotification(
    notification: NotificationItem
  ): void {

    // Mark notification as read

    this.notificationService.markAsRead(
      notification.id
    );

    notification.read = true;


    // ============================================
    // OPEN TICKET
    // ============================================

    if (notification.ticket) {

      /*
       * Notification contains the display ticket ID.
       *
       * Example:
       * TKT-008
       *
       * Ticket details route requires:
       * /ticket/8
       *
       * Extract the numeric database ID from
       * the end of the ticket identifier.
       */

      const match =
        notification.ticket.match(
          /(\d+)$/
        );


      if (match) {

        const ticketId =
          Number(match[1]);


        console.log(
          'Opening ticket:',
          notification.ticket,
          '->',
          ticketId
        );


        this.router.navigate([
          '/ticket',
          ticketId
        ]);

      } else {

        console.error(
          'Invalid ticket identifier:',
          notification.ticket
        );
      }
    }


    this.cdr.detectChanges();
  }


  // =========================================================
  // MARK ALL READ
  // =========================================================

  markAllRead(): void {

    this.notificationService.markAllAsRead(
      this.notifications
    );

    this.notifications =
      this.notifications.map(
        notification => ({
          ...notification,
          read: true
        })
      );

    this.cdr.detectChanges();
  }


  // =========================================================
  // FILTER
  // =========================================================

  setFilter(
    filter: string
  ): void {

    this.selectedFilter =
      filter;
  }


  setType(
    type: string
  ): void {

    this.selectedType =
      type;
  }


  // =========================================================
  // REFRESH
  // =========================================================

  refresh(): void {

    this.loadNotifications();
  }

}