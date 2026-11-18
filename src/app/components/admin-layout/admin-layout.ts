
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
import { NavigationLockService } from '../../services/navigation-lock.service';

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

  navigationLocked = false;

  private notificationSubscription?: Subscription;

  private navigationLockSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private navigationLock: NavigationLockService
  ) {}

  // ==========================================================
  // COMPONENT INITIALIZATION
  // ==========================================================

  ngOnInit(): void {

    this.loadUser();

    // Subscribe to the shared notification count.
    this.notificationSubscription =
      this.notificationService.unreadCount$.subscribe(count => {

        this.notificationCount = count;

        this.cdr.markForCheck();

      });

    // Subscribe to the shared navigation lock state.
    this.navigationLockSubscription =
      this.navigationLock.locked$.subscribe(locked => {

        this.navigationLocked = locked;

        this.cdr.markForCheck();

      });

    // Start a single notification polling mechanism.
    // The service performs the initial request immediately,
    // followed by requests at the configured interval.
    this.notificationService.startPolling();
  }

  // ==========================================================
  // LOAD USER
  // ==========================================================

  private loadUser(): void {

    this.user = this.authService.getUser();

  }

  // ==========================================================
  // OPEN NOTIFICATIONS
  // ==========================================================

  openNotifications(): void {

    if (this.navigationLocked) {
      return;
    }

    void this.router.navigate(['/notifications']);

  }

  // ==========================================================
  // OPEN PROFILE
  // ==========================================================

  openProfile(): void {

    if (this.navigationLocked) {
      return;
    }

    void this.router.navigate(['/settings']);

  }

  // ==========================================================
  // TOGGLE SIDEBAR
  // ==========================================================

  toggleSidebar(): void {

    this.sidebarCollapsed = !this.sidebarCollapsed;

  }

  // ==========================================================
  // AVATAR LETTER
  // ==========================================================

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

  // ==========================================================
  // USER ROLE
  // ==========================================================

  get userRole(): string {

    return (
      this.user?.Role ||
      this.user?.role ||
      'Admin'
    );

  }

  // ==========================================================
  // LOGOUT
  // ==========================================================

  logout(): void {
  console.log('Logout button clicked');

  // Stop notification polling immediately
  this.notificationService.stopPolling();

  this.authService.logoutApi().subscribe({
    next: (response) => {
      console.log('Logout API successful:', response);

      this.authService.clearSession();

      this.router.navigateByUrl('/login', {
        replaceUrl: true
      });
    },

    error: (error) => {
      console.error('Logout API failed:', error);

      // Always clear local session if API fails
      this.authService.clearSession();

      this.router.navigateByUrl('/login', {
        replaceUrl: true
      });
    }
  });


  }

  // ==========================================================
  // COMPONENT CLEANUP
  // ==========================================================

  ngOnDestroy(): void {

    // Release the notification badge subscription.
    // Do not stop polling here because the layout may be
    // recreated while the authenticated session remains active.
    this.notificationSubscription?.unsubscribe();

    // Release navigation lock subscription.
    this.navigationLockSubscription?.unsubscribe();

  }

}
