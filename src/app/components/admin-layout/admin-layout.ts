import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import {
  Subscription,
  filter
} from 'rxjs';

import { AuthService } from '../../services/auth.service';

import {
  NotificationService
} from '../../services/notifications.service';


@Component({
  selector: 'app-admin-layout',

  standalone: true,

  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],

  templateUrl: './admin-layout.html',

  styleUrl: './admin-layout.css'
})
export class AdminLayout
  implements OnInit, OnDestroy {


  user: any = null;


  /*
   * REAL unread notification count
   */

  notificationCount = 0;


  private notificationSubscription:
    Subscription | null = null;


  private routerSubscription:
    Subscription | null = null;


  constructor(
    private authService: AuthService,

    private notificationService:
      NotificationService,

    private router: Router
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    this.loadUser();

    this.loadNotificationCount();


    /*
     * Listen for notification count changes.
     */

    this.notificationSubscription =
      this.notificationService
        .unreadCount$
        .subscribe(count => {

          this.notificationCount =
            count;

        });


    /*
     * Refresh count when navigating.
     *
     * This is useful after opening
     * Notifications and marking items read.
     */

    this.routerSubscription =
      this.router.events
        .pipe(
          filter(
            event =>
              event instanceof NavigationEnd
          )
        )
        .subscribe(() => {

          this.loadNotificationCount();

        });
  }


  // =========================================================
  // LOAD USER
  // =========================================================

  private loadUser(): void {

    this.user =
      this.authService.getUser();


    console.log(
      'Admin Layout User:',
      this.user
    );

    console.log(
      'Username:',
      this.user?.Username
    );

    console.log(
      'Role:',
      this.user?.Role
    );
  }


  // =========================================================
  // LOAD NOTIFICATION COUNT
  // =========================================================

  private loadNotificationCount(): void {

    this.notificationService
      .getNotifications()
      .subscribe({

        next: (notifications) => {

          this.notificationCount =
            notifications.filter(
              notification =>
                !notification.read
            ).length;


          console.log(
            'Unread notification count:',
            this.notificationCount
          );
        },

        error: (error) => {

          console.error(
            'Unable to load notification count:',
            error
          );

          this.notificationCount = 0;
        }

      });
  }


  // =========================================================
  // OPEN NOTIFICATIONS
  // =========================================================

  openNotifications(): void {

    this.router.navigate([
      '/notifications'
    ]);
  }


  // =========================================================
  // AVATAR
  // =========================================================

  get avatarLetter(): string {

    const username =
      this.user?.Username ||
      this.user?.username ||
      '';


    if (!username) {

      return '';
    }


    return username
      .trim()
      .charAt(0)
      .toUpperCase();
  }


  // =========================================================
  // ROLE
  // =========================================================

  get userRole(): string {

    return (
      this.user?.Role ||
      this.user?.role ||
      'Admin'
    );
  }


  // =========================================================
  // LOGOUT
  // =========================================================

  logout(): void {

    this.authService.logout();

    this.router.navigate([
      '/login'
    ]);
  }


  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {

    this.notificationSubscription
      ?.unsubscribe();

    this.routerSubscription
      ?.unsubscribe();
  }

}