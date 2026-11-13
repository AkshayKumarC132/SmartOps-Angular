
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
  map,
  timer,
  catchError,
  of,
  finalize
} from 'rxjs';

import Swal from 'sweetalert2';
import { environment } from '../../environments/environment';

// =========================================================
// NOTIFICATION INTERFACE
// =========================================================

export interface NotificationItem {
  id: number;
  ticket: string | null;
  performed_by: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string;
  created_at: string;
  title: string;
  details: string;
  read: boolean;
  channel: string;
  deliveryStatus: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  // =========================================================
  // API CONFIGURATION
  // =========================================================

  private readonly apiUrl =
    `${environment.apiUrl.replace(/\/+$/, '')}/notifications/`;

  private readonly readStorageKey =
    'smartops_read_notifications';

  // Check only the Notifications API every 20 minutes.
  private readonly pollingIntervalMs = 1200000;

  // =========================================================
  // POLLING VARIABLES
  // =========================================================

  private pollingSubscription?: Subscription;

  private pollingStarted = false;

  private initialFetchCompleted = false;

  private pollingRequestInProgress = false;

  // Stores IDs already processed by background polling.
  private knownNotificationIds = new Set<number>();

  // =========================================================
  // NOTIFICATION SUBJECTS
  // =========================================================

  private readonly unreadCountSubject =
    new BehaviorSubject<number>(0);

  readonly unreadCount$ =
    this.unreadCountSubject.asObservable();

  private readonly notificationsSubject =
    new BehaviorSubject<NotificationItem[]>([]);

  readonly notifications$ =
    this.notificationsSubject.asObservable();

  private readonly newNotificationSubject =
    new Subject<NotificationItem>();

  readonly newNotification$ =
    this.newNotificationSubject.asObservable();

  constructor(
    private http: HttpClient
  ) {}

  // =========================================================
  // START GLOBAL NOTIFICATION POLLING
  // =========================================================

  startPolling(): void {

    if (this.pollingStarted) {
      console.log(
        '[SmartOps Notifications] Polling already running.'
      );
      return;
    }

    this.pollingStarted = true;

    console.log(
      '[SmartOps Notifications] Starting notification polling.',
      this.apiUrl
    );

    // Fetch immediately and then every 5 seconds.
    this.pollingSubscription = timer(
      0,
      this.pollingIntervalMs
    ).subscribe(() => {
      this.fetchNotifications(true);
    });
  }

  // =========================================================
  // STOP POLLING
  // =========================================================

  stopPolling(): void {

    this.pollingSubscription?.unsubscribe();

    this.pollingSubscription = undefined;

    this.pollingStarted = false;

    console.log(
      '[SmartOps Notifications] Polling stopped.'
    );
  }

  // =========================================================
  // GET NOTIFICATIONS FOR NOTIFICATIONS PAGE
  // =========================================================

  getNotifications(): Observable<NotificationItem[]> {

    console.log(
      '[SmartOps Notifications] Fetching notifications.'
    );

    return this.http.get<any>(this.apiUrl).pipe(

      map((response: any) => {

        const notifications =
          this.normalizeNotifications(response);

        const incoming =
          this.convertNotifications(notifications);

        const merged = this.mergeNotifications(
          this.notificationsSubject.value,
          incoming
        );

        this.publishNotifications(merged);

        return this.notificationsSubject.value;
      }),

      catchError(error => {

        console.error(
          '[SmartOps Notifications] Failed to load notifications:',
          error
        );

        return of(this.notificationsSubject.value);
      })
    );
  }

  // =========================================================
  // NORMALIZE API RESPONSE
  // =========================================================

  private normalizeNotifications(response: any): any[] {

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.results)) {
      return response.results;
    }

    if (Array.isArray(response?.notifications)) {
      return response.notifications;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    console.warn(
      '[SmartOps Notifications] Unexpected API response:',
      response
    );

    return [];
  }

  // =========================================================
  // BACKGROUND NOTIFICATION POLLING
  // =========================================================

  private fetchNotifications(
    showNewNotifications: boolean
  ): void {

    if (this.pollingRequestInProgress) {
      return;
    }

    this.pollingRequestInProgress = true;

    console.log(
      '[SmartOps Notifications] Checking Notifications API.'
    );

    this.http.get<any>(this.apiUrl).pipe(

      map((response: any) =>
        this.normalizeNotifications(response)
      ),

      catchError(error => {

        console.error(
          '[SmartOps Notifications] Polling failed:',
          error
        );

        return of(null);
      }),

      finalize(() => {

        this.pollingRequestInProgress = false;
      })

    ).subscribe(notifications => {

      if (notifications === null) {
        return;
      }

      const sortedNotifications = [...notifications].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );

      // -----------------------------------------------------
      // FIRST FETCH
      // -----------------------------------------------------

      // Existing notifications should appear in the list,
      // but must not generate popups on application startup.

      if (!this.initialFetchCompleted) {

        for (const notification of sortedNotifications) {

          const id = Number(notification.id);

          if (Number.isFinite(id)) {
            this.knownNotificationIds.add(id);
          }
        }

        this.initialFetchCompleted = true;

        const incoming =
          this.convertNotifications(notifications);

        this.publishNotifications(
          this.mergeNotifications(
            this.notificationsSubject.value,
            incoming
          )
        );

        console.log(
          '[SmartOps Notifications] Initial fetch completed.',
          {
            total: this.notificationsSubject.value.length,
            unread: this.unreadCountSubject.value
          }
        );

        return;
      }

      // -----------------------------------------------------
      // DETECT NEW NOTIFICATIONS
      // -----------------------------------------------------

      const newNotifications: any[] = [];

      for (const notification of sortedNotifications) {

        const id = Number(notification.id);

        if (!Number.isFinite(id)) {

          console.warn(
            '[SmartOps Notifications] Invalid notification ID:',
            notification
          );

          continue;
        }

        if (!this.knownNotificationIds.has(id)) {

          newNotifications.push(notification);

          this.knownNotificationIds.add(id);
        }
      }

      // -----------------------------------------------------
      // UPDATE NOTIFICATION LIST
      // -----------------------------------------------------

      const incoming =
        this.convertNotifications(notifications);

      this.publishNotifications(
        this.mergeNotifications(
          this.notificationsSubject.value,
          incoming
        )
      );

      // -----------------------------------------------------
      // SHOW POPUP FOR NEW NOTIFICATIONS
      // -----------------------------------------------------

      if (
        showNewNotifications &&
        newNotifications.length > 0
      ) {

        console.log(
          '[SmartOps Notifications] New notifications detected:',
          newNotifications.length
        );

        for (const item of newNotifications) {

          const notification =
            this.convertNotification(item);

          console.log(
            '[SmartOps Notifications] Showing popup:',
            notification
          );

          this.newNotificationSubject.next(notification);

          this.showToast(notification);
        }
      }
    });
  }

  // =========================================================
  // MERGE NOTIFICATIONS BY ID
  // =========================================================

  private mergeNotifications(
    existing: NotificationItem[],
    incoming: NotificationItem[]
  ): NotificationItem[] {

    const notificationMap =
      new Map<number, NotificationItem>();

    for (const notification of existing) {

      notificationMap.set(
        notification.id,
        notification
      );
    }

    for (const notification of incoming) {

      const previous =
        notificationMap.get(notification.id);

      notificationMap.set(notification.id, {

        ...notification,

        // Preserve locally updated read state.
        read: Boolean(
          previous?.read || notification.read
        )
      });
    }

    return Array.from(notificationMap.values()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );
  }

  // =========================================================
  // PUBLISH NOTIFICATIONS
  // =========================================================

  private publishNotifications(
    notifications: NotificationItem[]
  ): void {

    const merged = this.mergeNotifications(
      this.notificationsSubject.value,
      notifications
    );

    this.notificationsSubject.next(merged);

    this.updateUnreadCount(merged);

    console.log(
      '[SmartOps Notifications] Badge updated:',
      this.unreadCountSubject.value,
      '| Total:',
      merged.length,
      '| Unread:',
      merged.filter(item => !item.read).length
    );
  }

  // =========================================================
  // CONVERT NOTIFICATION RECORDS
  // =========================================================

  private convertNotifications(
    notifications: any[]
  ): NotificationItem[] {

    return notifications

      .map(notification =>
        this.convertNotification(notification)
      )

      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
  }

  // =========================================================
  // CONVERT SINGLE NOTIFICATION
  // =========================================================

  private convertNotification(
    item: any
  ): NotificationItem {

    const action = this.cleanAction(
      item.action || item.event_type
    );

    const ticket =
      item.ticket ||
      item.ticket_identifier ||
      null;

    const id = Number(item.id);

    const readIds = this.getReadIds();

    const description =
      item.description ||
      item.message ||
      '';

    const details =
      item.details ||
      item.message ||
      this.getDetails(action, item);

    return {

      id,

      ticket,

      performed_by:
        item.performed_by ||
        item.actor ||
        null,

      action,

      field:
        item.field || null,

      old_value:
        item.old_value || null,

      new_value:
        item.new_value || null,

      description,

      created_at:
        item.created_at || '',

      title:
        item.title ||
        this.getTitle(action, ticket, item),

      details,

      read: Boolean(
        item.is_read ??
        item.read ??
        readIds.includes(id)
      ),

      channel:
        item.channel || 'In App',

      deliveryStatus:
        item.deliveryStatus || 'Delivered'
    };
  }

  // =========================================================
  // SHOW POPUP FOR NEW NOTIFICATION
  // =========================================================

  private showToast(
    notification: NotificationItem
  ): void {

    const ticketId =
      this.getTicketId(notification.ticket);

    console.log(
      '[SmartOps Notifications] Displaying popup:',
      notification.title
    );

    void Swal.fire({

      toast: true,

      position: 'top-end',

      icon: 'info',

      title: notification.title,

      text:
        notification.details !== '—'
          ? notification.details
          : '',

      showConfirmButton: true,

      confirmButtonText: 'View',

      showCloseButton: true,

      timer: 8000,

      timerProgressBar: true,

      didOpen: toast => {

        toast.addEventListener(
          'mouseenter',
          Swal.stopTimer
        );

        toast.addEventListener(
          'mouseleave',
          Swal.resumeTimer
        );
      }

    }).then(result => {

      if (
        result.isConfirmed &&
        ticketId !== null
      ) {

        window.location.href =
          `/ticket/${ticketId}`;
      }
    });
  }

  // =========================================================
  // CLEAN ACTION
  // =========================================================

  private cleanAction(action: any): string {

    return String(action || '')

      .replace(/[()'",]/g, '')

      .trim()

      .toUpperCase();
  }

  // =========================================================
  // NOTIFICATION TITLE
  // =========================================================

  private getTitle(
    action: string,
    ticket: string | null,
    item: any
  ): string {

    const ticketText = ticket
      ? ` ${ticket}`
      : '';

    switch (action) {

      case 'CREATED':
      case 'TICKET_CREATED':

        return `New ticket${ticketText} created`;

      case 'STATUS_CHANGED': {

        const newStatus =
          String(item.new_value || '').toUpperCase();

        if (newStatus === 'REOPENED') {

          return `Ticket${ticketText} has been reopened`;
        }

        return `Ticket${ticketText} status changed`;
      }

      case 'ASSIGNED':
      case 'TICKET_ASSIGNED':

        return `Ticket${ticketText} was assigned`;

      case 'ATTACHMENT_ADDED':

        return `Attachment added to${ticketText}`;

      case 'ATTACHMENT_DELETED':

        return `Attachment deleted from${ticketText}`;

      case 'TAG_ADDED':

        return `Tag added to${ticketText}`;

      case 'TAG_REMOVED':

        return `Tag removed from${ticketText}`;

      case 'DELETED':
      case 'TICKET_DELETED':

        return `Ticket${ticketText} was deleted`;

      case 'ACCESS_DENIED':

        return `Access denied for${ticketText}`;

      case 'UPDATED':

        return `Ticket${ticketText} was updated`;

      case 'COMMENT_ADDED':

        return `Comment added to${ticketText}`;

      case 'KB_GENERATED':

        return `Knowledge base generated for${ticketText}`;

      default:

        return item.title ||
          `Activity on${ticketText}`;
    }
  }

  // =========================================================
  // NOTIFICATION DETAILS
  // =========================================================

  private getDetails(
    action: string,
    item: any
  ): string {

    if (item.message) {
      return item.message;
    }

    if (item.description) {
      return item.description;
    }

    if (
      action === 'STATUS_CHANGED' &&
      item.old_value &&
      item.new_value
    ) {

      return `${item.old_value} → ${item.new_value}`;
    }

    if (
      (
        action === 'ASSIGNED' ||
        action === 'TICKET_ASSIGNED'
      ) &&
      item.new_value
    ) {

      return item.new_value;
    }

    if (
      action === 'ATTACHMENT_ADDED' &&
      item.new_value
    ) {

      return item.new_value;
    }

    if (
      action === 'ATTACHMENT_DELETED' &&
      item.old_value
    ) {

      return item.old_value;
    }

    return '—';
  }

  // =========================================================
  // GET READ IDS FROM LOCAL STORAGE
  // =========================================================

  private getReadIds(): number[] {

    try {

      const value =
        localStorage.getItem(this.readStorageKey);

      if (!value) {
        return [];
      }

      const parsed = JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed.map(Number)
        : [];

    } catch (error) {

      console.warn(
        '[SmartOps Notifications] Unable to read saved read IDs:',
        error
      );

      return [];
    }
  }

  // =========================================================
  // SAVE READ IDS
  // =========================================================

  private saveReadIds(ids: number[]): void {

    try {

      localStorage.setItem(

        this.readStorageKey,

        JSON.stringify([...new Set(ids)])
      );

    } catch (error) {

      console.error(
        '[SmartOps Notifications] Unable to save read IDs:',
        error
      );
    }
  }

  // =========================================================
  // MARK ONE NOTIFICATION AS READ
  // =========================================================

  markAsRead(id: number): void {

    const readIds = this.getReadIds();

    if (!readIds.includes(id)) {

      readIds.push(id);

      this.saveReadIds(readIds);
    }

    // Update UI immediately.
    const updated = this.notificationsSubject.value.map(
      notification =>

        notification.id === id

          ? { ...notification, read: true }

          : notification
    );

    this.publishNotifications(updated);

    // Persist read state in Django.
    this.http.post(
      `${this.apiUrl}${id}/read/`,
      {}
    ).subscribe({

      next: () => {

        console.log(
          '[SmartOps Notifications] Notification marked as read:',
          id
        );
      },

      error: error => {

        console.error(
          '[SmartOps Notifications] Failed to mark notification as read:',
          error
        );
      }
    });
  }

  // =========================================================
  // MARK ALL NOTIFICATIONS AS READ
  // =========================================================

  markAllAsRead(
    notifications: NotificationItem[]
  ): void {

    const readIds = this.getReadIds();

    for (const notification of notifications) {

      if (!readIds.includes(notification.id)) {

        readIds.push(notification.id);
      }
    }

    this.saveReadIds(readIds);

    // Update UI immediately.
    const updated = this.notificationsSubject.value.map(
      notification => ({
        ...notification,
        read: true
      })
    );

    this.publishNotifications(updated);

    // Persist all read states in Django.
    this.http.post(
      `${this.apiUrl}mark-all-read/`,
      {}
    ).subscribe({

      next: () => {

        console.log(
          '[SmartOps Notifications] All notifications marked as read.'
        );
      },

      error: error => {

        console.error(
          '[SmartOps Notifications] Failed to mark all notifications as read:',
          error
        );
      }
    });
  }

  // =========================================================
  // UPDATE UNREAD COUNT
  // =========================================================

  private updateUnreadCount(
    notifications: NotificationItem[]
  ): void {

    const count = notifications.filter(
      notification => !notification.read
    ).length;

    this.unreadCountSubject.next(count);
  }

  // =========================================================
  // GET CURRENT UNREAD COUNT
  // =========================================================

  getCurrentUnreadCount(): number {

    return this.unreadCountSubject.value;
  }

  // =========================================================
  // REFRESH NOTIFICATIONS
  // =========================================================

  refreshUnreadCount(): void {

    this.fetchNotifications(false);
  }

  // =========================================================
  // GET TICKET DATABASE ID
  // =========================================================

  private getTicketId(
    ticket: unknown
  ): number | null {

    if (typeof ticket === 'number') {

      return Number.isSafeInteger(ticket) && ticket > 0
        ? ticket
        : null;
    }

    if (typeof ticket !== 'string') {
      return null;
    }

    const match = ticket.trim().match(/(\d+)$/);

    if (!match) {
      return null;
    }

    const id = Number(match[1]);

    return Number.isSafeInteger(id) && id > 0
      ? id
      : null;
  }
}
