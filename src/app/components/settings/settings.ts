import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';


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

  organizationName = '—';

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


  // =========================================================
  // USER ID
  // =========================================================

  private currentUserId: number | null = null;


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(

    private authService: AuthService,

    private userService: UserService,

    private router: Router,

    private cdr: ChangeDetectorRef,

    private http: HttpClient

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


    // =======================================================
    // USER NOT LOGGED IN
    // =======================================================

    if (!loggedInUser) {

      this.router.navigate([
        '/login'
      ]);

      return;
    }


    // =======================================================
    // GET USER ID
    // =======================================================

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


    this.currentUserId =
      Number(userId);


    // =======================================================
    // FIRST: LOAD ORGANIZATION FROM LOGIN DATA
    // =======================================================

    /*
     * The login API already provides organization
     * information for the Admin user.
     *
     * We use this before calling the profile API so
     * Organization does not depend on the UserSerializer.
     */

    this.setOrganizationFromUser(
      loggedInUser
    );


    // =======================================================
    // GET LATEST USER DETAILS
    // =======================================================

    this.userService
      .getUser(Number(userId))
      .subscribe({

        next: (response: any) => {

          console.log(
            'Settings User API Response:',
            response
          );


          // =================================================
          // STORE COMPLETE USER RESPONSE
          // =================================================

          this.user = response;


          // =================================================
          // PROFILE DATA
          // =================================================

          this.form.first_name =
            response?.first_name ||
            '';

          this.form.last_name =
            response?.last_name ||
            '';

          this.form.email =
            response?.email ||
            '';


          // =================================================
          // ORGANIZATION
          // =================================================

          /*
           * First try API response.
           *
           * If API response does not contain organization,
           * setOrganizationFromUser() will leave the value
           * already obtained from login data.
           */

          this.setOrganizationFromUser(
            response,
            false
          );


          // =================================================
          // FALLBACK TO LOGIN DATA IF NECESSARY
          // =================================================

          if (
            !this.organizationName ||
            this.organizationName === '—'
          ) {

            this.setOrganizationFromUser(
              loggedInUser
            );

          }


          this.loading = false;

          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Unable to load profile:',
            error
          );


          // =================================================
          // FALLBACK TO LOGIN DATA
          // =================================================

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
              '',

            first_name:
              loggedInUser.first_name ||
              '',

            last_name:
              loggedInUser.last_name ||
              '',

            organization:
              loggedInUser.organization,

            Organization:
              loggedInUser.Organization,

            organization_id:
              loggedInUser.organization_id,

            organization_name:
              loggedInUser.organization_name

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


          // =================================================
          // ORGANIZATION FROM LOGIN DATA
          // =================================================

          this.setOrganizationFromUser(
            loggedInUser
          );


          this.loading = false;


          // =================================================
          // ERROR MESSAGE
          // =================================================

          if (error.status === 401) {

            this.errorMessage =
              'Your session has expired. Please login again.';

          }

          else if (error.status === 403) {

            this.errorMessage =
              'You do not have permission to view this profile.';

          }

          else if (error.status === 0) {

            this.errorMessage =
              'Unable to connect to the backend server.';

          }

          else {

            this.errorMessage =
              'Unable to load your profile.';

          }


          this.cdr.detectChanges();

        }

      });

  }


  // =========================================================
  // SET ORGANIZATION FROM USER RESPONSE
  // =========================================================

  setOrganizationFromUser(
    response: any,
    allowOverwrite: boolean = true
  ): void {

    console.log(
      'Checking organization data:',
      response
    );


    // =======================================================
    // ORGANIZATION OBJECT
    // =======================================================

    if (
      response?.organization &&
      typeof response.organization === 'object' &&
      !Array.isArray(response.organization)
    ) {

      const organization =
        response.organization;


      const name =
        organization.name ||
        organization.organization_name ||
        organization['Organization Name'] ||
        organization['name'] ||
        organization.title;


      if (
        name &&
        (
          allowOverwrite ||
          this.organizationName === '—'
        )
      ) {

        this.organizationName =
          name;

        console.log(
          'Organization name from object:',
          this.organizationName
        );

      }

      return;
    }


    // =======================================================
    // ORGANIZATION RETURNED AS STRING
    // =======================================================

    if (
      typeof response?.organization === 'string'
    ) {

      if (
        allowOverwrite ||
        this.organizationName === '—'
      ) {

        this.organizationName =
          response.organization;

        console.log(
          'Organization name from string:',
          this.organizationName
        );

      }

      return;
    }


    // =======================================================
    // organization_name
    // =======================================================

    if (
      response?.organization_name
    ) {

      if (
        allowOverwrite ||
        this.organizationName === '—'
      ) {

        this.organizationName =
          response.organization_name;

        console.log(
          'Organization name from organization_name:',
          this.organizationName
        );

      }

      return;
    }


    // =======================================================
    // Organization Name
    // =======================================================

    if (
      response?.['Organization Name']
    ) {

      if (
        allowOverwrite ||
        this.organizationName === '—'
      ) {

        this.organizationName =
          response['Organization Name'];

        console.log(
          'Organization name from Organization Name:',
          this.organizationName
        );

      }

      return;
    }


    // =======================================================
    // Organization OBJECT WITH CAPITAL O
    // =======================================================

    if (
      response?.Organization &&
      typeof response.Organization === 'object' &&
      !Array.isArray(response.Organization)
    ) {

      const organization =
        response.Organization;


      const name =
        organization.name ||
        organization.organization_name ||
        organization['Organization Name'] ||
        organization.Name ||
        organization.title;


      if (
        name &&
        (
          allowOverwrite ||
          this.organizationName === '—'
        )
      ) {

        this.organizationName =
          name;

        console.log(
          'Organization name from Organization object:',
          this.organizationName
        );

      }

      return;
    }


    // =======================================================
    // Organization ID ONLY
    // =======================================================

    const organizationId =
      response?.organization_id ??
      response?.organizationId ??
      response?.Organization?.id ??
      response?.Organization?.['Organization Id'] ??
      (
        response?.organization &&
        typeof response.organization === 'number'
          ? response.organization
          : null
      );


    if (organizationId) {

      console.log(
        'Organization ID found:',
        organizationId
      );


      /*
       * Keep the existing functionality of loading the
       * organization if only an ID is available.
       *
       * This does NOT affect the normal login-data solution.
       */

      this.loadOrganization(
        Number(organizationId)
      );

      return;
    }


    // =======================================================
    // NOTHING FOUND
    // =======================================================

    /*
     * Do not immediately overwrite an organization that
     * was already obtained from login data.
     */

    if (
      this.organizationName === '—'
    ) {

      console.warn(
        'No organization information found in user response.'
      );

    }

  }


  // =========================================================
  // LOAD ORGANIZATION
  // =========================================================

  loadOrganization(
    organizationId: number
  ): void {

    console.log(
      'Loading organization:',
      organizationId
    );


    this.http
      .get<any>(
        `${environment.apiUrl}/organization/${organizationId}/`
      )
      .subscribe({

        next: (organization) => {

          console.log(
            'Organization API Response:',
            organization
          );


          const name =
            organization?.name ||
            organization?.organization_name ||
            organization?.['Organization Name'] ||
            organization?.Name ||
            organization?.title;


          if (name) {

            this.organizationName =
              name;

          }


          console.log(
            'Final Organization Name:',
            this.organizationName
          );


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Unable to load organization:',
            error
          );


          /*
           * Do not erase an organization name that may
           * already have been obtained from login data.
           */

          if (
            !this.organizationName ||
            this.organizationName === '—'
          ) {

            this.organizationName = '—';

          }


          this.cdr.detectChanges();

        }

      });

  }


  // =========================================================
  // USER ID
  // =========================================================

  get userId(): number | null {

    return this.currentUserId;

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


    // =======================================================
    // USER ID VALIDATION
    // =======================================================

    if (!this.userId) {

      this.errorMessage =
        'Unable to identify the current user.';

      return;
    }


    // =======================================================
    // EMAIL VALIDATION
    // =======================================================

    if (!this.form.email.trim()) {

      this.errorMessage =
        'Email address is required.';

      return;
    }


    this.saving = true;


    // =======================================================
    // PAYLOAD
    // =======================================================

    const payload = {

      first_name:
        this.form.first_name.trim(),

      last_name:
        this.form.last_name.trim(),

      email:
        this.form.email.trim()

    };


    // =======================================================
    // UPDATE USER
    // =======================================================

    this.userService
      .updateUser(
        this.userId,
        payload
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Profile updated:',
            response
          );


          // =================================================
          // UPDATE SCREEN
          // =================================================

          this.user = {

            ...this.user,

            first_name:
              payload.first_name,

            last_name:
              payload.last_name,

            email:
              payload.email

          };


          // =================================================
          // UPDATE LOCAL STORAGE
          // =================================================

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


            /*
             * Keep the existing organization data.
             *
             * Do not replace the complete localStorage
             * object with the profile API response.
             */

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

          }

          else if (error.status === 401) {

            this.errorMessage =
              'Your session has expired. Please login again.';

          }

          else if (error.status === 403) {

            this.errorMessage =
              'You do not have permission to update this profile.';

          }

          else if (error.status === 0) {

            this.errorMessage =
              'Unable to connect to the backend server.';

          }

          else {

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


    // =======================================================
    // CURRENT PASSWORD
    // =======================================================

    if (
      !this.passwordForm
        .current_password
        .trim()
    ) {

      this.passwordErrorMessage =
        'Current password is required.';

      return;
    }


    // =======================================================
    // NEW PASSWORD
    // =======================================================

    if (
      !this.passwordForm
        .new_password
        .trim()
    ) {

      this.passwordErrorMessage =
        'New password is required.';

      return;
    }


    // =======================================================
    // CONFIRM PASSWORD
    // =======================================================

    if (
      !this.passwordForm
        .confirm_password
        .trim()
    ) {

      this.passwordErrorMessage =
        'Please confirm your new password.';

      return;
    }


    // =======================================================
    // PASSWORD LENGTH
    // =======================================================

    if (
      this.passwordForm
        .new_password
        .length < 7
    ) {

      this.passwordErrorMessage =
        'Password must be at least 7 characters long.';

      return;
    }


    // =======================================================
    // PASSWORD MATCH
    // =======================================================

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


    // =======================================================
    // SAME PASSWORD
    // =======================================================

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


    // =======================================================
    // CHANGE PASSWORD API
    // =======================================================

    this.userService
      .changePassword(
        this.passwordForm
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Password change response:',
            response
          );


          this.changingPassword = false;


          this.passwordSuccessMessage =
            response?.Message ||
            response?.message ||
            'Password changed successfully.';


          // =================================================
          // CLEAR PASSWORD FIELDS
          // =================================================

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

          }

          else if (error.status === 401) {

            this.passwordErrorMessage =
              'Your session has expired. Please login again.';

          }

          else if (error.status === 403) {

            this.passwordErrorMessage =
              'You do not have permission to change this password.';

          }

          else if (error.status === 0) {

            this.passwordErrorMessage =
              'Unable to connect to the backend server.';

          }

          else {

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