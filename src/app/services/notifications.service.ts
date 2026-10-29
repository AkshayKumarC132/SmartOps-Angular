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
  private readonly apiUrl =
    `${environment.apiUrl}/tickets-activity/`;

  private readonly readStorageKey =
    'smartops_read_notifications';

  private readonly pollingIntervalMs = 15000;

  private pollingSubscription?: Subscription;
  private pollingStarted = false;
  private initialFetchCompleted = false;
  private pollingRequestInProgress = false;

  private knownActivityIds = new Set<number>();

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

  constructor(private http: HttpClient) {}

  // =========================================================
  // START GLOBAL POLLING
  // =========================================================

  startPolling(): void {
    if (this.pollingStarted) {
      return;
    }

    this.pollingStarted = true;

    // Fetch immediately, then every 15 seconds.
    this.pollingSubscription = timer(
      0,
      this.pollingIntervalMs
    ).subscribe(() => {
      this.fetchActivities(true);
    });
  }

  // =========================================================
  // STOP POLLING
  // =========================================================

  stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
    this.pollingStarted = false;
  }

  // =========================================================
  // GET NOTIFICATIONS FOR THE NOTIFICATIONS PAGE
  // =========================================================

  getNotifications(): Observable<NotificationItem[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((response: any) => {
        const activities = this.normalizeActivities(response);
        const incoming = this.convertActivities(activities);

        const merged = this.mergeNotifications(
          this.notificationsSubject.value,
          incoming
        );

        this.publishNotifications(merged);

        return this.notificationsSubject.value;
      })
    );
  }

  // =========================================================
  // NORMALIZE API RESPONSE
  // =========================================================

  private normalizeActivities(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.results)) {
      return response.results;
    }

    if (Array.isArray(response?.activities)) {
      return response.activities;
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
  // BACKGROUND POLLING
  // =========================================================

  private fetchActivities(showNewNotifications: boolean): void {
    if (this.pollingRequestInProgress) {
      return;
    }

    this.pollingRequestInProgress = true;

    this.http.get<any>(this.apiUrl).pipe(
      map((response: any) => this.normalizeActivities(response)),

      catchError(error => {
        console.error(
          '[SmartOps Notifications] Polling request failed:',
          error
        );

        // Preserve the existing badge if the request fails.
        return of(null);
      }),

      finalize(() => {
        this.pollingRequestInProgress = false;
      })
    ).subscribe(activities => {
      if (activities === null) {
        return;
      }

      const sortedActivities = [...activities].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );

      // First successful poll establishes the baseline.
      // Existing activities do not trigger startup toasts.
      if (!this.initialFetchCompleted) {
        for (const activity of sortedActivities) {
          const id = Number(activity.id);

          if (Number.isFinite(id)) {
            this.knownActivityIds.add(id);
          }
        }

        this.initialFetchCompleted = true;

        const incoming = this.convertActivities(activities);

        this.publishNotifications(
          this.mergeNotifications(
            this.notificationsSubject.value,
            incoming
          )
        );

        console.log(
          '[SmartOps Notifications] Initial poll complete.',
          {
            activities: this.notificationsSubject.value.length,
            unread: this.unreadCountSubject.value
          }
        );

        return;
      }

      const newActivities: any[] = [];

      for (const activity of sortedActivities) {
        const id = Number(activity.id);

        if (!Number.isFinite(id)) {
          console.warn(
            '[SmartOps Notifications] Activity has no valid ID:',
            activity
          );
          continue;
        }

        if (!this.knownActivityIds.has(id)) {
          newActivities.push(activity);
          this.knownActivityIds.add(id);
        }
      }

      // Merge incoming data with the current shared list.
      const incoming = this.convertActivities(activities);

      this.publishNotifications(
        this.mergeNotifications(
          this.notificationsSubject.value,
          incoming
        )
      );

      // Alert only for newly detected activities.
      if (showNewNotifications) {
        for (const activity of newActivities) {
          const notification = this.convertActivity(activity);

          console.log(
            '[SmartOps Notifications] New activity detected:',
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
    const notificationMap = new Map<number, NotificationItem>();

    for (const notification of existing) {
      notificationMap.set(notification.id, notification);
    }

    for (const notification of incoming) {
      const previous = notificationMap.get(notification.id);

      notificationMap.set(notification.id, {
        ...notification,
        // Preserve read state across polling and page navigation.
        read: Boolean(previous?.read || notification.read)
      });
    }

    return Array.from(notificationMap.values()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );
  }

  // =========================================================
  // PUBLISH NOTIFICATIONS AND UNREAD COUNT
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
      merged.filter(notification => !notification.read).length
    );
  }

  // =========================================================
  // CONVERT ACTIVITIES
  // =========================================================

  private convertActivities(
    activities: any[]
  ): NotificationItem[] {
    return activities
      .map(activity => this.convertActivity(activity))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
  }

  private convertActivity(activity: any): NotificationItem {
    const action = this.cleanAction(activity.action);

    const ticket =
      activity.ticket ||
      activity.ticket_identifier ||
      null;

    const readIds = this.getReadIds();
    const id = Number(activity.id);

    return {
      id,
      ticket,
      performed_by: activity.performed_by || null,
      action,
      field: activity.field || null,
      old_value: activity.old_value || null,
      new_value: activity.new_value || null,
      description: activity.description || '',
      created_at: activity.created_at || '',
      title: this.getTitle(action, ticket, activity),
      details: this.getDetails(action, activity),
      read: readIds.includes(id),
      channel: 'In App',
      deliveryStatus: 'Sent'
    };
  }

  // =========================================================
  // SHOW ALERT FOR NEW ACTIVITY
  // =========================================================

  private showToast(notification: NotificationItem): void {
    const ticketId = this.getTicketId(notification.ticket);

    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: notification.title,
      text: notification.details !== '—'
        ? notification.details
        : '',
      showConfirmButton: true,
      confirmButtonText: 'View',
      showCloseButton: true,
      timer: 8000,
      timerProgressBar: true,
      didOpen: toast => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    }).then(result => {
      if (result.isConfirmed && ticketId !== null) {
        window.location.href = `/ticket/${ticketId}`;
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
    activity: any
  ): string {
    const ticketText = ticket ? ` ${ticket}` : '';

    switch (action) {
      case 'CREATED':
      case 'TICKET_CREATED':
        return `New ticket${ticketText} created`;

      case 'STATUS_CHANGED': {
        const newStatus =
          String(activity.new_value || '').toUpperCase();

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
        return `Activity on${ticketText}`;
    }
  }

  // =========================================================
  // NOTIFICATION DETAILS
  // =========================================================

  private getDetails(action: string, activity: any): string {
    if (
      action === 'STATUS_CHANGED' &&
      activity.old_value &&
      activity.new_value
    ) {
      return `${activity.old_value} → ${activity.new_value}`;
    }

    if (
      (
        action === 'ASSIGNED' ||
        action === 'TICKET_ASSIGNED'
      ) &&
      activity.new_value
    ) {
      return activity.new_value;
    }

    if (
      action === 'ATTACHMENT_ADDED' &&
      activity.new_value
    ) {
      return activity.new_value;
    }

    if (
      action === 'ATTACHMENT_DELETED' &&
      activity.old_value
    ) {
      return activity.old_value;
    }

    if (activity.description) {
      return activity.description;
    }

    return '—';
  }

  // =========================================================
  // READ IDS IN LOCAL STORAGE
  // =========================================================

  private getReadIds(): number[] {
    try {
      const value = localStorage.getItem(this.readStorageKey);

      if (!value) {
        return [];
      }

      const parsed = JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed.map(Number)
        : [];
    } catch (error) {
      console.warn(
        '[SmartOps Notifications] Could not read saved read IDs:',
        error
      );

      return [];
    }
  }

  private saveReadIds(ids: number[]): void {
    try {
      localStorage.setItem(
        this.readStorageKey,
        JSON.stringify([...new Set(ids)])
      );
    } catch (error) {
      console.error(
        '[SmartOps Notifications] Could not save read IDs:',
        error
      );
    }
  }

  // =========================================================
  // MARK ONE AS READ
  // =========================================================

  markAsRead(id: number): void {
    const readIds = this.getReadIds();

    if (!readIds.includes(id)) {
      readIds.push(id);
      this.saveReadIds(readIds);
    }

    const updated = this.notificationsSubject.value.map(
      notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
    );

    this.publishNotifications(updated);
  }

  // =========================================================
  // MARK ALL AS READ
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

    const updated = this.notificationsSubject.value.map(
      notification => ({
        ...notification,
        read: true
      })
    );

    this.publishNotifications(updated);
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

  getCurrentUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  // =========================================================
  // REFRESH
  // =========================================================

  refreshUnreadCount(): void {
    this.fetchActivities(false);
  }

  // =========================================================
  // GET TICKET DATABASE ID
  // =========================================================

  private getTicketId(ticket: unknown): number | null {
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
