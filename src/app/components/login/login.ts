
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

  login(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';

    if (!this.username.trim() || !this.password) {
      this.errorMessage = this.invalidLoginMessage;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.authService
      .login(this.username.trim(), this.password)
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            const accessToken = this.authService.getAccessToken();
            const user = this.authService.getUser();
            const role = this.authService.getUserRole();

            // Only Admin users may continue.
            if (
              !accessToken ||
              !user ||
              !role ||
              role.trim().toLowerCase() !== 'admin'
            ) {
              this.authService.logout();
              this.password = '';
              this.errorMessage = this.invalidLoginMessage;
              this.loading = false;
              this.cdr.detectChanges();
              return;
            }

            this.loading = false;
            this.cdr.detectChanges();

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
                console.error('Dashboard navigation error:', error);

                this.ngZone.run(() => {
                  this.errorMessage =
                    'Unable to open the dashboard. Please try again.';
                  this.cdr.detectChanges();
                });
              });
          });
        },

        error: (error: unknown) => {
          console.error('Login request failed:', error);

          this.ngZone.run(() => {
            this.loading = false;
            this.password = '';
            this.errorMessage = this.invalidLoginMessage;

            this.cdr.detectChanges();

            console.log('Login UI updated:', {
              loading: this.loading,
              errorMessage: this.errorMessage
            });
          });
        }
      });
  }
}
