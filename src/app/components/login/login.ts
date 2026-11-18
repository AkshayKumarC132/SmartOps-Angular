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

  // ==========================================================
  // TOGGLE PASSWORD VISIBILITY
  // ==========================================================

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

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
        'Access denied. Only Admin users can log in to this dashboard.';

    } else if (error === 'session-expired') {
      this.errorMessage =
        'Your session has expired. Please log in again.';
    }

  }

  // ==========================================================
  // LOGIN
  // ==========================================================

  login(): void {

    if (this.loading) {
      return;
    }

    this.errorMessage = '';

    // Validate input fields.
    if (!this.username.trim() || !this.password) {
      this.errorMessage =
        'Please enter both username and password.';

      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    // Step 1: Validate credentials with backend.
    this.authService
      .login(this.username.trim(), this.password)
      .subscribe({

        next: (loginResponse) => {

          this.ngZone.run(() => {

            // Read confirmation token and user information.
            const confirmationToken =
              loginResponse?.['Confirmation Token'];

            const user =
              loginResponse?.['User Information'];

            const role =
              user?.Role ?? user?.role;

            // Step 2: Validate user information.
            if (!user) {
              this.finishFailedLogin(
                'Login failed. Unable to retrieve user information.'
              );
              return;
            }

            // Step 3: Validate Admin login eligibility.
            if (
              typeof role !== 'string' ||
              role.trim().toLowerCase() !== 'admin'
            ) {
              this.finishFailedLogin(
                'Access denied. Only Admin users can log in to this dashboard.'
              );
              return;
            }

            // Step 4: Validate confirmation token.
            if (
              typeof confirmationToken !== 'string' ||
              !confirmationToken.trim()
            ) {
              this.finishFailedLogin(
                'Login verification failed. Please try again.'
              );
              return;
            }

            // Step 5: Confirm backend session.
            this.authService
              .confirmSession(confirmationToken, user)
              .subscribe({

                next: (confirmResponse) => {

                  this.ngZone.run(() => {

                    // Read confirmed user information.
                    const confirmedUser =
                      confirmResponse?.['User Information'];

                    const confirmedRole =
                      confirmedUser?.Role ??
                      confirmedUser?.role;

                    // Step 6: Validate confirmed user.
                    if (!confirmedUser) {
                      this.finishFailedLogin(
                        'Session verification failed. Please try logging in again.'
                      );
                      return;
                    }

                    // Step 7: Validate confirmed Admin role.
                    if (
                      typeof confirmedRole !== 'string' ||
                      confirmedRole.trim().toLowerCase() !== 'admin'
                    ) {
                      this.finishFailedLogin(
                        'Access denied. Your account does not have Admin permissions.'
                      );
                      return;
                    }

                    // Successful login.
                    this.loading = false;
                    this.cdr.detectChanges();

                    // Step 8: Navigate to dashboard.
                    this.router.navigate(['/dashboard'])
                      .then((navigated: boolean) => {

                        this.ngZone.run(() => {

                          if (!navigated) {
                            this.errorMessage =
                              'Login successful, but unable to open the dashboard. Please try again.';
                          }

                          this.cdr.detectChanges();
                        });

                      })
                      .catch((error: unknown) => {

                        console.error(
                          'Dashboard navigation error:',
                          error
                        );

                        this.ngZone.run(() => {

                          this.errorMessage =
                            'Login successful, but unable to open the dashboard. Please try again.';

                          this.cdr.detectChanges();
                        });

                      });

                  });

                },

                error: (error: unknown) => {

                  console.error(
                    'Session confirmation failed:',
                    error
                  );

                  this.finishFailedLogin(
                    'Unable to establish your session. Please try logging in again.'
                  );

                }

              });

          });

        },

        error: (error: any) => {

          console.error(
            'Login request failed:',
            error
          );

          this.ngZone.run(() => {

            this.loading = false;
            this.password = '';

            // ==================================================
            // HANDLE DIFFERENT LOGIN ERRORS
            // ==================================================

            if (error?.status === 401) {

              this.errorMessage =
                'Invalid username or password.';

            } else if (error?.status === 403) {

              this.errorMessage =
                'Access denied. You do not have permission to log in.';

            } else if (error?.status === 404) {

              this.errorMessage =
                'Login service not found. Please contact the administrator.';

            } else if (error?.status === 429) {

              this.errorMessage =
                'Maximum login attempts exceeded. Please try again later.';

            } else if (error?.status === 0) {

              this.errorMessage =
                'Unable to connect to the server. Please check your internet connection.';

            } else if (error?.status >= 500) {

              this.errorMessage =
                'Server error occurred. Please try again later.';

            } else {

              this.errorMessage =
                'Login failed. Please try again.';

            }

            this.cdr.detectChanges();

          });

        }

      });

  }

  // ==========================================================
  // HANDLE FAILED LOGIN
  // ==========================================================

  private finishFailedLogin(message: string): void {

    this.ngZone.run(() => {

      // Clear authentication information.
      this.authService.clearSession();

      this.password = '';
      this.errorMessage = message;
      this.loading = false;

      this.cdr.detectChanges();

    });

  }

}