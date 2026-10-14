
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { ApiErrorService } from '../../services/api-error.service';

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

  constructor(
    private authService: AuthService,
    private apiErrorService: ApiErrorService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Preserve the existing role-guard message.
    if (
      this.route.snapshot.queryParamMap.get('error') === 'not-admin'
    ) {
      this.errorMessage =
        'Access Denied: You are not an Admin. Please use an administrator account to access the Admin Portal.';
    }

    // Preserve the existing session-expired redirect message.
    if (
      this.route.snapshot.queryParamMap.get('error') === 'session-expired'
    ) {
      this.errorMessage =
        'Your session has expired. Please log in again.';
    }
  }

  login(): void {
    this.errorMessage = '';

    // Prevent duplicate login submissions.
    if (this.loading) {
      return;
    }

    if (!this.username.trim() || !this.password) {
      this.errorMessage =
        'Username and password are required.';
      return;
    }

    this.loading = true;

    this.authService
      .login(
        this.username.trim(),
        this.password
      )
      .subscribe({
        next: () => {
          const accessToken =
            this.authService.getAccessToken();

          const user =
            this.authService.getUser();

          this.loading = false;

          // Validate the access token.
          if (!accessToken) {
            this.authService.logout();

            this.errorMessage =
              'Login succeeded, but access token was not received.';

            return;
          }

          // Validate the logged-in user.
          if (!user) {
            this.authService.logout();

            this.errorMessage =
              'Unable to retrieve user information. Please try again.';

            return;
          }

          // Preserve Admin-only access.
          const role =
            this.authService.getUserRole();

          if (
            !role ||
            role.trim().toLowerCase() !== 'admin'
          ) {
            console.warn(
              'Access denied. User role:',
              role
            );

            this.authService.logout();
            this.password = '';

            this.errorMessage =
              'Access Denied: You are not an Admin. Please use an administrator account to access the Admin Portal.';

            return;
          }

          // Navigate after successful Admin login.
          this.router.navigate(['/dashboard'])
            .then((navigated: boolean) => {
              if (!navigated) {
                this.errorMessage =
                  'Login successful, but dashboard navigation failed. Please try again.';
              }
            })
            .catch((error: unknown) => {
              console.error(
                'Dashboard navigation error:',
                error
              );

              this.errorMessage =
                'Unable to open the dashboard. Please try again.';
            });
        },

        error: (error: unknown) => {
          console.error('Login error:', error);

          this.loading = false;

          // Preserve the specific invalid-credentials message.
          if (
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            error.status === 401
          ) {
            this.errorMessage =
              'Invalid username or password.';

            return;
          }

          // Use shared messages for other API errors.
          this.errorMessage =
            this.apiErrorService.getErrorMessage(error);
        }
      });
  }
}
