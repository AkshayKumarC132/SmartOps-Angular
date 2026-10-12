
import { Component } from '@angular/core';
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Display the message when redirected by the role guard.
    if (
      this.route.snapshot.queryParamMap.get('error') === 'not-admin'
    ) {
      this.errorMessage =
        'Access Denied: You are not an Admin. Please use an administrator account to access the Admin Portal.';
    }
  }

  login(): void {

    this.errorMessage = '';

    if (
      !this.username ||
      !this.password
    ) {
      this.errorMessage =
        'Username and password are required.';
      return;
    }

    this.loading = true;

    this.authService
      .login(
        this.username,
        this.password
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Login completed:',
            response
          );

          const accessToken =
            this.authService.getAccessToken();

          const user =
            this.authService.getUser();

          console.log(
            'Access token available:',
            !!accessToken
          );

          console.log(
            'Logged-in user:',
            user
          );

          this.loading = false;

          // ==========================================
          // VALIDATE AUTHENTICATION
          // ==========================================

          if (!accessToken) {

            this.authService.logout();

            this.errorMessage =
              'Login succeeded, but access token was not received.';

            return;
          }

          // ==========================================
          // VALIDATE USER INFORMATION
          // ==========================================

          if (!user) {

            this.authService.logout();

            this.errorMessage =
              'Unable to retrieve user information. Please try again.';

            return;
          }

          // ==========================================
          // CHECK ADMIN ROLE
          // ==========================================

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

            // Clear the session for unauthorized users.
            this.authService.logout();

            this.password = '';

            this.errorMessage =
              'Access Denied: You are not an Admin. Please use an administrator account to access the Admin Portal.';

            return;
          }

          // ==========================================
          // ADMIN LOGIN SUCCESSFUL
          // ==========================================

          console.log(
            'Admin login successful. Navigating to dashboard.'
          );

          this.router.navigate([
            '/dashboard'
          ]).then((navigated: boolean) => {

            if (!navigated) {

              this.errorMessage =
                'Login successful, but dashboard navigation failed. Please try again.';
            }

          }).catch((error: any) => {

            console.error(
              'Dashboard navigation error:',
              error
            );

            this.errorMessage =
              'Unable to open the dashboard. Please try again.';

          });

        },

        error: (error: any) => {

          console.error(
            'Login error:',
            error
          );

          this.loading = false;

          if (
            error.status === 401
          ) {

            this.errorMessage =
              'Invalid username or password.';

          } else if (
            error.status === 400
          ) {

            this.errorMessage =
              'Invalid login request.';

          } else if (
            error.status === 0
          ) {

            this.errorMessage =
              'Unable to connect to the backend server.';

          } else {

            this.errorMessage =
              'Unable to login. Please try again.';
          }

        }

      });
  }

}
