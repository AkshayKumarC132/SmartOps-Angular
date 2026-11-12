
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { Subscription } from 'rxjs';

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
 sidebarCollapsed = false;
  notificationCount = 0;

  private notificationSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUser();

    // Subscribe to the shared notification count.
    this.notificationSubscription =
      this.notificationService.unreadCount$.subscribe(count => {
        this.notificationCount = count;
        this.cdr.markForCheck();
      });

    // Start a single notification polling mechanism.
    // The service performs the initial request immediately,
    // followed by requests at the configured interval.
    this.notificationService.startPolling();
  }

  private loadUser(): void {
    this.user = this.authService.getUser();
  }

  openNotifications(): void {
    this.router.navigate(['/notifications']);
  }
  openProfile(): void {
  this.router.navigate(['/settings']);
}
 toggleSidebar(): void {
  this.sidebarCollapsed = !this.sidebarCollapsed;
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
    // Stop notification polling before clearing the session.
    this.notificationService.stopPolling();

    this.authService.logout();

    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    // Release the notification badge subscription.
    // Do not stop polling here because the layout may be
    // recreated while the authenticated session remains active.
    this.notificationSubscription?.unsubscribe();
  }
}
