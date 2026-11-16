
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

  private readonly invalidLoginMessage =
    'Invalid username/password/role.';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error === 'not-admin') {
      this.errorMessage = this.invalidLoginMessage;

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
      this.errorMessage = this.invalidLoginMessage;
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

            // Read access token, refresh token and user information.
            const accessToken =
              loginResponse?.['Access'];

            const refreshToken =
              loginResponse?.['Refresh'];

            const user =
              loginResponse?.['User Information'];

            const role =
              user?.Role ?? user?.role;

            // Step 2: Validate frontend login requirements.
            if (
              typeof accessToken !== 'string' ||
              !accessToken.trim() ||
              typeof refreshToken !== 'string' ||
              !refreshToken.trim() ||
              !user ||
              typeof role !== 'string' ||
              role.trim().toLowerCase() !== 'admin'
            ) {
              this.finishFailedLogin();
              return;
            }

            // Step 3: Confirm the backend session.
            this.authService
              .confirmSession(
                accessToken,
                refreshToken,
                user

              )
              .subscribe({

                next: () => {

                  this.ngZone.run(() => {

                    this.loading = false;
                    this.cdr.detectChanges();

                    // Step 4: Navigate only after session confirmation.
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
                      .catch((error: unknown) => {

                        console.error(
                          'Dashboard navigation error:',
                          error
                        );

                        this.ngZone.run(() => {

                          this.errorMessage =
                            'Unable to open the dashboard. Please try again.';

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

                  this.finishFailedLogin();
                }

              });

          });

        },

        error: (error: unknown) => {
          console.error(
            'Login request failed:',
            error
          );

          this.ngZone.run(() => {
            this.loading = false;
            this.password = '';
            this.errorMessage = this.invalidLoginMessage;
            this.cdr.detectChanges();
          });

        }

      });

  }

  // ==========================================================
  // HANDLE FAILED LOGIN
  // ==========================================================

  private finishFailedLogin(): void {
    this.ngZone.run(() => {

      // Clear any locally stored authentication information.
      this.authService.clearSession();
      this.password = '';
      this.errorMessage = this.invalidLoginMessage;
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

}
