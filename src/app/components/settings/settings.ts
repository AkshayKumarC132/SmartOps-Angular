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

import {
  NotificationPreferences
} from '../../models/users.model';


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
  // NOTIFICATION PREFERENCES
  // FRONTEND ONLY
  // =========================================================

  notificationPreferences: NotificationPreferences = {

    in_app: {
      ticket_assigned: true,
      ticket_status_changed: true,
      ticket_comments: true,
      sla_warnings: true,
      ai_suggestions: true
    },

    email: {
      ticket_updates: true,
      weekly_digest: false,
      mentions: true
    },

    slack: {
      critical_alerts: true,
      sla_alerts: true,
      team_mentions: false
    }

  };


  // =========================================================
  // NOTIFICATION MESSAGES
  // =========================================================

  notificationSuccessMessage = '';

  notificationErrorMessage = '';


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
    // LOAD FRONTEND NOTIFICATION PREFERENCES
    // =======================================================

    this.loadNotificationPreferences();


    // =======================================================
    // ORGANIZATION FROM LOGIN DATA
    // =======================================================

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

          this.setOrganizationFromUser(
            response,
            false
          );


          // =================================================
          // FALLBACK TO LOGIN DATA
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
          // ORGANIZATION
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
  // DEFAULT NOTIFICATION PREFERENCES
  // =========================================================

  private getDefaultNotificationPreferences():
    NotificationPreferences {

    return {

      in_app: {
        ticket_assigned: true,
        ticket_status_changed: true,
        ticket_comments: true,
        sla_warnings: true,
        ai_suggestions: true
      },

      email: {
        ticket_updates: true,
        weekly_digest: false,
        mentions: true
      },

      slack: {
        critical_alerts: true,
        sla_alerts: true,
        team_mentions: false
      }

    };

  }


  // =========================================================
  // NOTIFICATION STORAGE KEY
  // =========================================================

  private getNotificationStorageKey(): string {

    return `smartops_notification_preferences_${this.currentUserId}`;

  }


  // =========================================================
  // LOAD NOTIFICATION PREFERENCES
  // =========================================================

  loadNotificationPreferences(): void {

    if (!this.currentUserId) {

      return;
    }


    const storageKey =
      this.getNotificationStorageKey();


    try {

      const saved =
        localStorage.getItem(storageKey);


      if (!saved) {

        this.notificationPreferences =
          this.getDefaultNotificationPreferences();

        return;
      }


      const parsed =
        JSON.parse(saved);


      this.notificationPreferences = {

        ...this.getDefaultNotificationPreferences(),

        ...parsed,

        in_app: {
          ...this.getDefaultNotificationPreferences().in_app,
          ...(parsed?.in_app || {})
        },

        email: {
          ...this.getDefaultNotificationPreferences().email,
          ...(parsed?.email || {})
        },

        slack: {
          ...this.getDefaultNotificationPreferences().slack,
          ...(parsed?.slack || {})
        }

      };


      console.log(
        'Notification preferences loaded:',
        this.notificationPreferences
      );

    }

    catch (error) {

      console.error(
        'Unable to load notification preferences:',
        error
      );


      this.notificationPreferences =
        this.getDefaultNotificationPreferences();

    }

  }


  // =========================================================
  // SAVE NOTIFICATION PREFERENCES
  // FRONTEND ONLY
  // =========================================================

  saveNotificationPreferences(): void {

    this.notificationSuccessMessage = '';

    this.notificationErrorMessage = '';


    if (!this.currentUserId) {

      this.notificationErrorMessage =
        'Unable to identify the current user.';

      return;
    }


    try {

      const storageKey =
        this.getNotificationStorageKey();


      localStorage.setItem(

        storageKey,

        JSON.stringify(
          this.notificationPreferences
        )

      );


      this.notificationSuccessMessage =
        'Notification preferences saved successfully.';


      console.log(
        'Notification preferences saved:',
        this.notificationPreferences
      );


      this.cdr.detectChanges();


      // Remove message after a few seconds.

      setTimeout(() => {

        this.notificationSuccessMessage = '';

        this.cdr.detectChanges();

      }, 3000);

    }

    catch (error) {

      console.error(
        'Unable to save notification preferences:',
        error
      );


      this.notificationErrorMessage =
        'Unable to save notification preferences.';


      this.cdr.detectChanges();

    }

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

      }

      return;
    }


    // =======================================================
    // ORGANIZATION STRING
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

      }

      return;
    }


    // =======================================================
    // Organization OBJECT
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

      }

      return;
    }


    // =======================================================
    // ORGANIZATION ID
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

      this.loadOrganization(
        Number(organizationId)
      );

      return;
    }


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


          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'Unable to load organization:',
            error
          );


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

    this.notificationSuccessMessage = '';

    this.notificationErrorMessage = '';

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

        next: (response: any) => {

          console.log(
            'Profile updated:',
            response
          );


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
          // UPDATE LOCAL USER DATA
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


    if (
      !this.passwordForm
        .current_password
        .trim()
    ) {

      this.passwordErrorMessage =
        'Current password is required.';

      return;
    }


    if (
      !this.passwordForm
        .new_password
        .trim()
    ) {

      this.passwordErrorMessage =
        'New password is required.';

      return;
    }


    if (
      !this.passwordForm
        .confirm_password
        .trim()
    ) {

      this.passwordErrorMessage =
        'Please confirm your new password.';

      return;
    }


    if (
      this.passwordForm
        .new_password
        .length < 7
    ) {

      this.passwordErrorMessage =
        'Password must be at least 7 characters long.';

      return;
    }


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