
import {
  Component,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  username = '';
  password = '';
  errorMessage = '';
  loading = false;
  showPassword = false;

  private readonly invalidLoginMessage =
    'Invalid username or password. Please try again.';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error === 'not-admin') {
      this.errorMessage =
        'You do not have permission to access the Admin Portal.';
    } else if (error === 'session-expired') {
      this.errorMessage =
        'Your session has expired. Please log in again.';
    }
  }

  login(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';

    if (!this.username.trim()) {
      this.errorMessage = 'Please enter your username.';
      return;
    }

    if (!this.password) {
      this.errorMessage = 'Please enter your password.';
      return;
    }

    this.loading = true;

    this.authService.login(
      this.username.trim(),
      this.password
    ).subscribe({
      next: (loginResponse) => {
        this.ngZone.run(() => {
          const confirmationToken =
            loginResponse?.['Confirmation Token'];

          const user =
            loginResponse?.['User Information'];

          const role = user?.Role ?? user?.role;

          // Validate the login response.
          if (
            typeof confirmationToken !== 'string' ||
            !confirmationToken.trim() ||
            !user ||
            typeof role !== 'string'
          ) {
            this.finishFailedLogin(
              'Login response is incomplete. Please try again.'
            );
            return;
          }

          // This is an Admin Portal.
          if (role.trim().toLowerCase() !== 'admin') {
            this.finishFailedLogin(
              'You do not have permission to access the Admin Portal.'
            );
            return;
          }

          // Confirm the pending session with Django.
          this.authService
            .confirmSession(confirmationToken, user)
            .subscribe({
              next: () => {
                this.ngZone.run(() => {
                  this.loading = false;
                  this.password = '';

                  this.cdr.detectChanges();

                  // Navigate only after session confirmation.
                  this.router.navigate(['/dashboard'])
                    .then((navigated: boolean) => {
                      this.ngZone.run(() => {
                        if (!navigated) {
                          this.errorMessage =
                            'Unable to open the dashboard. Please try again.';
                        }

                        this.cdr.detectChanges();
                      });
                    })
                    .catch(() => {
                      this.ngZone.run(() => {
                        this.errorMessage =
                          'Unable to open the dashboard. Please try again.';

                        this.cdr.detectChanges();
                      });
                    });
                });
              },

              error: (error: unknown) => {
                this.handleLoginError(error);
              }
            });
        });
      },

      error: (error: unknown) => {
        this.handleLoginError(error);
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  private handleLoginError(error: unknown): void {
    this.ngZone.run(() => {
      const err = error as {
        status?: number;
        error?: {
          Code?: string;
          code?: string;
          Error?: string;
          error?: string;
          detail?: string;
          message?: string;
        };
      };

      const statusCode = err?.status;
      const response = err?.error || {};

      const errorCode = String(
        response.Code || response.code || ''
      ).toUpperCase();

      const backendMessage = String(
        response.Error ||
        response.error ||
        response.detail ||
        response.message ||
        ''
      );

      const messageToCheck =
        `${errorCode} ${backendMessage}`.toLowerCase();

      if (
        errorCode === 'MAX_ACTIVE_SESSIONS' ||
        messageToCheck.includes('maximum active session') ||
        messageToCheck.includes('active sessions limit')
      ) {
        this.errorMessage =
          'You have reached the maximum active session limit. Please log out from another device.';

      } else if (
        errorCode === 'LOGIN_ATTEMPTS_EXCEEDED' ||
        messageToCheck.includes('maximum login attempts') ||
        messageToCheck.includes('too many login attempts')
      ) {
        this.errorMessage =
          'Maximum failed login attempts exceeded. Please try again later.';

      } else if (
        errorCode === 'ACCOUNT_INACTIVE' ||
        messageToCheck.includes('account is inactive') ||
        messageToCheck.includes('account disabled')
      ) {
        this.errorMessage =
          'Your account is inactive. Please contact your administrator.';

      } else if (
        errorCode === 'ORGANIZATION_INACTIVE' ||
        messageToCheck.includes('organization is inactive') ||
        messageToCheck.includes('organization is deactivated')
      ) {
        this.errorMessage =
          'Your organization is currently inactive. Please contact your administrator.';

      } else if (
        errorCode === 'ROLE_NOT_ALLOWED' ||
        messageToCheck.includes('role not allowed') ||
        messageToCheck.includes('permission denied')
      ) {
        this.errorMessage =
          'You do not have permission to access this portal.';

      } else if (errorCode === 'SESSION_EXPIRED') {
        this.errorMessage =
          'Your session has expired. Please log in again.';

      } else if (statusCode === 0) {
        this.errorMessage =
          'Unable to connect to SmartOps server. Please check your connection.';

      } else if (statusCode === 400) {
        this.errorMessage =
          'Invalid login request. Please check your username and password.';

      } else if (statusCode === 401) {
        this.errorMessage = this.invalidLoginMessage;

      } else if (statusCode === 403) {
        this.errorMessage =
          'Access denied. You are not authorized to log in.';

      } else if (statusCode === 404) {
        this.errorMessage =
          'Login service not found. Please contact support.';

      } else if (statusCode === 429) {
        this.errorMessage =
          'Too many login requests. Please wait before trying again.';

      } else if (
        statusCode !== undefined &&
        statusCode >= 500
      ) {
        this.errorMessage =
          'SmartOps server error. Please try again later.';

      } else {
        this.errorMessage = this.invalidLoginMessage;
      }

      this.finishLoading();
    });
  }

  private finishFailedLogin(
    message: string = this.invalidLoginMessage
  ): void {
    this.authService.clearSession();

    this.errorMessage = message;
    this.finishLoading();
  }

  private finishLoading(): void {
    this.password = '';
    this.loading = false;
    this.cdr.detectChanges();
  }
}
