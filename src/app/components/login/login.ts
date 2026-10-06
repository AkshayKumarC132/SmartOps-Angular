import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
    private router: Router
  ) {}


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
          // MAKE SURE AUTHENTICATION WAS STORED
          // ==========================================

          if (!accessToken) {

            this.errorMessage =
              'Login succeeded, but access token was not received.';

            return;
          }


          // ==========================================
          // NAVIGATE TO DASHBOARD
          // ==========================================

          this.router.navigate([
            '/dashboard'
          ]);

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