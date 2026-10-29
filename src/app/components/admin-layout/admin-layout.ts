
import {
  ChangeDetectorRef,
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
import { NotificationService } from '../../services/notifications.service';

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
export class AdminLayout implements OnInit, OnDestroy {
  user: any = null;

  notificationCount = 0;

  private notificationSubscription?: Subscription;
  private routerSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUser();

    // Subscribe to the shared count before starting or refreshing polling.
    this.notificationSubscription =
      this.notificationService.unreadCount$.subscribe(count => {
        this.notificationCount = count;
        this.cdr.markForCheck();
      });

    // Ensure background polling is active.
    // The service prevents duplicate polling instances.
    this.notificationService.startPolling();

    // Refresh the current count without waiting for the next interval.
    this.notificationService.refreshUnreadCount();

    // Keep the badge synchronized when navigating between pages.
    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        this.notificationService.refreshUnreadCount();
      });
  }

  private loadUser(): void {
    this.user = this.authService.getUser();
  }

  openNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  get avatarLetter(): string {
    const username =
      this.user?.Username ||
      this.user?.username ||
      '';

    if (!username) {
      return '';
    }

    return username.trim().charAt(0).toUpperCase();
  }

  get userRole(): string {
    return (
      this.user?.Role ||
      this.user?.role ||
      'Admin'
    );
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.notificationSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();

    // Do not stop global polling here.
    // The root application may still need notifications.
  }
}
