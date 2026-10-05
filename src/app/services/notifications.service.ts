import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  map
} from 'rxjs';

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

  private apiUrl =
    `${environment.apiUrl}/tickets-activity/`;

  private readonly readStorageKey =
    'smartops_read_notifications';


  /*
   * This is the important part.
   *
   * Admin Layout listens to this value.
   *
   * Example:
   *
   * 5 unread
   * 4 unread
   * 0 unread
   */

  private unreadCountSubject =
    new BehaviorSubject<number>(0);

  unreadCount$ =
    this.unreadCountSubject.asObservable();


  constructor(
    private http: HttpClient
  ) {}


  // =========================================================
  // GET NOTIFICATIONS
  // =========================================================

  getNotifications():
    Observable<NotificationItem[]> {

    return this.http
      .get<any[]>(this.apiUrl)
      .pipe(

        map((activities) => {

          if (!Array.isArray(activities)) {

            this.unreadCountSubject.next(0);

            return [];
          }


          const notifications =
            activities
              .map(activity =>
                this.convertActivity(activity)
              )
              .sort(
                (a, b) =>
                  new Date(
                    b.created_at
                  ).getTime() -
                  new Date(
                    a.created_at
                  ).getTime()
              );


          /*
           * Update bell count
           */

          const unreadCount =
            notifications.filter(
              notification =>
                !notification.read
            ).length;


          this.unreadCountSubject.next(
            unreadCount
          );


          return notifications;
        })

      );
  }


  // =========================================================
  // CONVERT ACTIVITY
  // =========================================================

  private convertActivity(
    activity: any
  ): NotificationItem {

    const action =
      this.cleanAction(
        activity.action
      );


    const ticket =
      activity.ticket ||
      activity.ticket_identifier ||
      null;


    const readIds =
      this.getReadIds();


    return {

      id: activity.id,

      ticket,

      performed_by:
        activity.performed_by || null,

      action,

      field:
        activity.field || null,

      old_value:
        activity.old_value || null,

      new_value:
        activity.new_value || null,

      description:
        activity.description || '',

      created_at:
        activity.created_at,

      title:
        this.getTitle(
          action,
          ticket,
          activity
        ),

      details:
        this.getDetails(
          action,
          activity
        ),

      read:
        readIds.includes(
          activity.id
        ),

      channel: 'In App',

      deliveryStatus: 'Sent'
    };
  }


  // =========================================================
  // CLEAN ACTION
  // =========================================================

  private cleanAction(
    action: any
  ): string {

    return String(action || '')
      .replace(/[()'",]/g, '')
      .trim()
      .toUpperCase();
  }


  // =========================================================
  // TITLE
  // =========================================================

  private getTitle(
    action: string,
    ticket: string | null,
    activity: any
  ): string {

    const ticketText =
      ticket
        ? ` ${ticket}`
        : '';


    switch (action) {

      case 'CREATED':

        return `New ticket${ticketText} created`;


      case 'STATUS_CHANGED':

        if (
          String(
            activity.new_value || ''
          ).toUpperCase() === 'REOPENED'
        ) {

          return (
            `Ticket${ticketText} has been reopened`
          );
        }

        return (
          `Ticket${ticketText} status changed`
        );


      case 'ASSIGNED':

        return (
          `Ticket${ticketText} was assigned`
        );


      case 'ATTACHMENT_ADDED':

        return (
          `Attachment added to${ticketText}`
        );


      case 'ATTACHMENT_DELETED':

        return (
          `Attachment deleted from${ticketText}`
        );


      case 'TAG_ADDED':

        return (
          `Tag added to${ticketText}`
        );


      case 'TAG_REMOVED':

        return (
          `Tag removed from${ticketText}`
        );


      case 'DELETED':

        return (
          `Ticket${ticketText} was deleted`
        );


      case 'ACCESS_DENIED':

        return (
          `Access denied for${ticketText}`
        );


      case 'UPDATED':

        return (
          `Ticket${ticketText} was updated`
        );


      case 'COMMENT_ADDED':

        return (
          `Comment added to${ticketText}`
        );


      case 'KB_GENERATED':

        return (
          `Knowledge base generated for${ticketText}`
        );


      default:

        return (
          `Activity on${ticketText}`
        );
    }
  }


  // =========================================================
  // DETAILS
  // =========================================================

  private getDetails(
    action: string,
    activity: any
  ): string {

    if (
      action === 'STATUS_CHANGED' &&
      activity.old_value &&
      activity.new_value
    ) {

      return (
        `${activity.old_value} → ` +
        `${activity.new_value}`
      );
    }


    if (
      action === 'ASSIGNED' &&
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
  // GET READ IDS
  // =========================================================

  private getReadIds(): number[] {

    const value =
      localStorage.getItem(
        this.readStorageKey
      );


    if (!value) {

      return [];
    }


    try {

      const parsed =
        JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed
        : [];

    } catch {

      return [];
    }
  }


  // =========================================================
  // MARK ONE READ
  // =========================================================

  markAsRead(
    id: number
  ): void {

    const readIds =
      this.getReadIds();


    if (!readIds.includes(id)) {

      readIds.push(id);

      localStorage.setItem(
        this.readStorageKey,
        JSON.stringify(readIds)
      );


      /*
       * Immediately decrease bell count.
       */

      const currentCount =
        this.unreadCountSubject.value;


      this.unreadCountSubject.next(
        Math.max(
          0,
          currentCount - 1
        )
      );
    }
  }


  // =========================================================
  // MARK ALL READ
  // =========================================================

  markAllAsRead(
    notifications: NotificationItem[]
  ): void {

    const readIds =
      this.getReadIds();


    for (
      const notification
      of notifications
    ) {

      if (
        !readIds.includes(
          notification.id
        )
      ) {

        readIds.push(
          notification.id
        );
      }
    }


    localStorage.setItem(
      this.readStorageKey,
      JSON.stringify(readIds)
    );


    /*
     * Immediately remove bell badge.
     */

    this.unreadCountSubject.next(0);
  }


  // =========================================================
  // CURRENT COUNT
  // =========================================================

  getCurrentUnreadCount(): number {

    return this.unreadCountSubject.value;
  }

  // =========================================================
  // REFRESH UNREAD COUNT
  // =========================================================

  refreshUnreadCount(): void {

    this.http
      .get<any[]>(this.apiUrl)
      .subscribe({

        next: (activities) => {

          if (!Array.isArray(activities)) {
            this.unreadCountSubject.next(0);
            return;
          }

          const readIds =
            this.getReadIds();

          const unreadCount =
            activities.filter(
              activity =>
                !readIds.includes(activity.id)
            ).length;

          this.unreadCountSubject.next(
            unreadCount
          );

          console.log(
            'Notification badge count:',
            unreadCount
          );
        },

        error: (error) => {

          console.error(
            'Unable to refresh notification count:',
            error
          );
        }
      });
  }

    }