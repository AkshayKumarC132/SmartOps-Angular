import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-settings',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './settings.html',

  styleUrl: './settings.css'
})
export class Settings implements OnInit {

  // =========================================================
  // USER
  // =========================================================

  user: any = null;

  loading = true;

  saving = false;


  // =========================================================
  // PROFILE MESSAGES
  // =========================================================

  successMessage = '';

  errorMessage = '';


  // =========================================================
  // ACTIVE SECTION
  // =========================================================

  activeSection = 'profile';


  // =========================================================
  // PROFILE FORM
  // =========================================================

  form = {

    first_name: '',

    last_name: '',

    email: ''

  };


  // =========================================================
  // PASSWORD FORM
  // =========================================================

  passwordForm = {

    current_password: '',

    new_password: '',

    confirm_password: ''

  };


  changingPassword = false;

  passwordSuccessMessage = '';

  passwordErrorMessage = '';


  constructor(
    private authService: AuthService,

    private userService: UserService,

    private router: Router,

    private cdr: ChangeDetectorRef
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    this.loadProfile();

  }


  // =========================================================
  // LOAD PROFILE
  // =========================================================

  loadProfile(): void {

    const loggedInUser =
      this.authService.getUser();


    if (!loggedInUser) {

      this.router.navigate([
        '/login'
      ]);

      return;
    }


    /*
     * Login response:
     *
     * {
     *   "User Id": 1,
     *   "Username": "...",
     *   "Role": "..."
     * }
     */

    const userId =
      loggedInUser['User Id'] ||
      loggedInUser.id;


    if (!userId) {

      console.error(
        'User ID not found in logged-in user data.'
      );

      this.errorMessage =
        'Unable to identify the logged-in user.';

      this.loading = false;

      return;
    }


    /*
     * Get latest user details
     * from Django.
     */

    this.userService
      .getUser(
        Number(userId)
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Settings User API Response:',
            response
          );


          this.user = response;


          this.form.first_name =
            response.first_name || '';


          this.form.last_name =
            response.last_name || '';


          this.form.email =
            response.email || '';


          this.loading = false;


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Unable to load profile:',
            error
          );


          /*
           * Fallback to login data.
           */

          this.user = {

            id: userId,

            username:
              loggedInUser['Username'] ||
              loggedInUser.username ||
              '',

            role:
              loggedInUser['Role'] ||
              loggedInUser.role ||
              '',

            email:
              loggedInUser.email ||
              ''
          };


          this.form.first_name =
            loggedInUser.first_name ||
            '';


          this.form.last_name =
            loggedInUser.last_name ||
            '';


          this.form.email =
            loggedInUser.email ||
            '';


          this.loading = false;


          if (error.status === 401) {

            this.errorMessage =
              'Your session has expired. Please login again.';

          } else if (error.status === 403) {

            this.errorMessage =
              'You do not have permission to view this profile.';

          } else if (error.status === 0) {

            this.errorMessage =
              'Unable to connect to the backend server.';

          } else {

            this.errorMessage =
              'Unable to load your profile.';
          }


          this.cdr.detectChanges();

        }

      });

  }


  // =========================================================
  // USER ID
  // =========================================================

  get userId(): number | null {

    return this.user?.id || null;

  }


  // =========================================================
  // USERNAME
  // =========================================================

  get username(): string {

    return this.user?.username || '';

  }


  // =========================================================
  // EMAIL
  // =========================================================

  get email(): string {

    return this.user?.email || '';

  }


  // =========================================================
  // ROLE
  // =========================================================

  get role(): string {

    return this.user?.role || '';

  }


  // =========================================================
  // DISPLAY NAME
  // =========================================================

  get displayName(): string {

    const firstName =
      this.user?.first_name || '';


    const lastName =
      this.user?.last_name || '';


    const fullName =
      `${firstName} ${lastName}`.trim();


    return (
      fullName ||
      this.username
    );

  }


  // =========================================================
  // AVATAR
  // =========================================================

  get avatarLetter(): string {

    const name =
      this.username ||
      this.form.first_name ||
      'U';


    return name
      .charAt(0)
      .toUpperCase();

  }


  // =========================================================
  // ORGANIZATION
  // =========================================================

  get organizationName(): string {

    return (
      this.user?.organization?.name ||
      this.user?.Organization?.[
        'Organization Name'
      ] ||
      '—'
    );

  }


  // =========================================================
  // SELECT SECTION
  // =========================================================

  selectSection(
    section: string
  ): void {

    this.activeSection =
      section;


    this.successMessage = '';

    this.errorMessage = '';


    this.passwordSuccessMessage = '';

    this.passwordErrorMessage = '';

  }


  // =========================================================
  // SAVE PROFILE
  // =========================================================

  saveProfile(): void {

    this.successMessage = '';

    this.errorMessage = '';


    if (!this.userId) {

      this.errorMessage =
        'Unable to identify the current user.';

      return;
    }


    if (!this.form.email.trim()) {

      this.errorMessage =
        'Email address is required.';

      return;
    }


    this.saving = true;


    const payload = {

      first_name:
        this.form.first_name.trim(),

      last_name:
        this.form.last_name.trim(),

      email:
        this.form.email.trim()

    };


    this.userService
      .updateUser(
        this.userId,
        payload
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Profile updated:',
            response
          );


          /*
           * Update screen immediately.
           */

          this.user = {

            ...this.user,

            first_name:
              payload.first_name,

            last_name:
              payload.last_name,

            email:
              payload.email

          };


          /*
           * Update localStorage.
           */

          const storedUser =
            this.authService.getUser();


          if (storedUser) {

            const updatedStoredUser = {

              ...storedUser,

              first_name:
                payload.first_name,

              last_name:
                payload.last_name,

              email:
                payload.email

            };


            localStorage.setItem(
              'user',
              JSON.stringify(
                updatedStoredUser
              )
            );

          }


          this.saving = false;


          this.successMessage =
            'Profile updated successfully.';


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Profile update failed:',
            error
          );


          this.saving = false;


          if (error.status === 400) {

            this.errorMessage =
              error.error?.Errors ||
              error.error?.Message ||
              error.error?.message ||
              'Invalid profile information.';

          } else if (error.status === 401) {

            this.errorMessage =
              'Your session has expired. Please login again.';

          } else if (error.status === 403) {

            this.errorMessage =
              'You do not have permission to update this profile.';

          } else if (error.status === 0) {

            this.errorMessage =
              'Unable to connect to the backend server.';

          } else {

            this.errorMessage =
              'Unable to update profile.';
          }


          this.cdr.detectChanges();

        }

      });

  }


  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  changePassword(): void {

    this.passwordSuccessMessage = '';

    this.passwordErrorMessage = '';


    /*
     * Current password
     */

    if (
      !this.passwordForm
        .current_password
        .trim()
    ) {

      this.passwordErrorMessage =
        'Current password is required.';

      return;
    }


    /*
     * New password
     */

    if (
      !this.passwordForm
        .new_password
        .trim()
    ) {

      this.passwordErrorMessage =
        'New password is required.';

      return;
    }


    /*
     * Confirm password
     */

    if (
      !this.passwordForm
        .confirm_password
        .trim()
    ) {

      this.passwordErrorMessage =
        'Please confirm your new password.';

      return;
    }


    /*
     * Minimum password length
     */

    if (
      this.passwordForm
        .new_password
        .length < 7
    ) {

      this.passwordErrorMessage =
        'Password must be at least 7 characters long.';

      return;
    }


    /*
     * Password match
     */

    if (
      this.passwordForm
        .new_password !==
      this.passwordForm
        .confirm_password
    ) {

      this.passwordErrorMessage =
        'New password and confirm password do not match.';

      return;
    }


    /*
     * Same password check
     */

    if (
      this.passwordForm
        .current_password ===
      this.passwordForm
        .new_password
    ) {

      this.passwordErrorMessage =
        'New password must be different from the current password.';

      return;
    }


    this.changingPassword = true;


    this.userService
      .changePassword(
        this.passwordForm
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Password change response:',
            response
          );


          this.changingPassword = false;


          this.passwordSuccessMessage =
            response?.Message ||
            response?.message ||
            'Password changed successfully.';


          /*
           * Clear all password fields
           * after successful change.
           */

          this.passwordForm = {

            current_password: '',

            new_password: '',

            confirm_password: ''

          };


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Password change failed:',
            error
          );


          this.changingPassword = false;


          if (error.status === 400) {

            this.passwordErrorMessage =
              error.error?.Message ||
              error.error?.message ||
              'Unable to change password.';

          } else if (error.status === 401) {

            this.passwordErrorMessage =
              'Your session has expired. Please login again.';

          } else if (error.status === 403) {

            this.passwordErrorMessage =
              'You do not have permission to change this password.';

          } else if (error.status === 0) {

            this.passwordErrorMessage =
              'Unable to connect to the backend server.';

          } else {

            this.passwordErrorMessage =
              'Unable to change password.';
          }


          this.cdr.detectChanges();

        }

      });

  }


  // =========================================================
  // LOGOUT
  // =========================================================

  logout(): void {

    this.authService.logout();

    this.router.navigate([
      '/login'
    ]);

  }

}