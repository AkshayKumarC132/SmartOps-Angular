import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  User,
  UserService
} from '../../services/user.service';


@Component({
  selector: 'app-user-management',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './user-management.html',
  styleUrl: './user-management.css'
})
export class UserManagement implements OnInit {

  users: User[] = [];

  loading = true;

  saving = false;

  errorMessage = '';

  successMessage = '';

  searchText = '';

  selectedRole = 'All';


  showInviteModal = false;

  showEditModal = false;


  editingUser: User | null = null;


  userForm = {
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'Requester',
    is_ai_enabled: false,
    is_active: true
  };


  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {

    this.loadUsers();

  }


  /* =====================================================
     LOAD USERS
     ===================================================== */

  loadUsers(): void {

    this.loading = true;

    this.errorMessage = '';


    this.userService
      .getUsers()
      .subscribe({

        next: (response) => {

          console.log(
            'User Management Response:',
            response
          );


          this.users =
            Array.isArray(response)
              ? response
              : [];


          this.loading = false;

          this.cdr.detectChanges();

        },


        error: (error) => {

          console.error(
            'User Management Error:',
            error
          );


          this.users = [];

          this.loading = false;


          if (error.status === 401) {

            this.errorMessage =
              'Authentication failed. Please login again.';

          }

          else if (error.status === 403) {

            this.errorMessage =
              'Only Admin users can view User Management.';

          }

          else {

            this.errorMessage =
              'Unable to load users.';

          }


          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     FILTERED USERS
     ===================================================== */

  get filteredUsers(): User[] {

    let result =
      [...this.users];


    const search =
      this.searchText
        .trim()
        .toLowerCase();


    if (search) {

      result =
        result.filter(
          user => {

            const username =
              user.username
                ?.toLowerCase() || '';

            const email =
              user.email
                ?.toLowerCase() || '';

            const firstName =
              user.first_name
                ?.toLowerCase() || '';

            const lastName =
              user.last_name
                ?.toLowerCase() || '';


            return (
              username.includes(search) ||
              email.includes(search) ||
              firstName.includes(search) ||
              lastName.includes(search)
            );

          }
        );

    }


    if (
      this.selectedRole !== 'All'
    ) {

      result =
        result.filter(
          user =>
            user.role ===
            this.selectedRole
        );

    }


    return result;

  }


  /* =====================================================
     ROLES
     ===================================================== */

  get roles(): string[] {

    const roleSet =
      new Set<string>();


    this.users.forEach(
      user => {

        if (user.role) {

          roleSet.add(
            user.role
          );

        }

      }
    );


    return Array.from(
      roleSet
    );

  }


  /* =====================================================
     USER NAME
     ===================================================== */

  getUserName(
    user: User
  ): string {

    const fullName =
      `${user.first_name || ''} ${user.last_name || ''}`
        .trim();


    return (
      fullName ||
      user.username ||
      'User'
    );

  }


  /* =====================================================
     INITIAL
     ===================================================== */

  getInitial(
    user: User
  ): string {

    const name =
      user.username ||
      user.first_name ||
      'U';


    return name
      .charAt(0)
      .toUpperCase();

  }


  /* =====================================================
     ROLE CLASS
     ===================================================== */

  getRoleClass(
    role: string
  ): string {

    switch (
      role?.toLowerCase()
    ) {

      case 'admin':
        return 'role-admin';

      case 'team member':
        return 'role-teammate';

      case 'teammate':
        return 'role-teammate';

      case 'requester':
        return 'role-requester';

      case 'agent':
        return 'role-agent';

      default:
        return 'role-default';

    }

  }


  /* =====================================================
     INVITE USER
     ===================================================== */

  openInviteModal(): void {

    this.userForm = {

      email: '',

      username: '',

      first_name: '',

      last_name: '',

      password: '',

      role: 'Requester',

      is_ai_enabled: false,

      is_active: true

    };


    this.errorMessage = '';

    this.successMessage = '';

    this.showInviteModal = true;

  }


  /* =====================================================
     CLOSE INVITE
     ===================================================== */

  closeInviteModal(): void {

    if (this.saving) {

      return;

    }


    this.showInviteModal = false;

    this.errorMessage = '';

  }


  /* =====================================================
     CREATE USER
     ===================================================== */

  createUser(): void {

    this.errorMessage = '';

    this.successMessage = '';


    if (
      !this.userForm.email.trim()
    ) {

      this.errorMessage =
        'Email is required.';

      return;

    }


    if (
      !this.userForm.username.trim()
    ) {

      this.errorMessage =
        'Username is required.';

      return;

    }


    if (!this.userForm.password) {

      this.errorMessage =
        'Password is required.';

      return;

    }


    const payload = {

      email:
        this.userForm.email.trim(),

      username:
        this.userForm.username.trim(),

      password:
        this.userForm.password,

      role:
        this.userForm.role

    };


    this.saving = true;


    this.userService
      .registerUser(payload)
      .subscribe({

        next: (response) => {

          console.log(
            'User created:',
            response
          );


          this.saving = false;

          this.showInviteModal = false;


          this.successMessage =
            'User created successfully.';


          this.loadUsers();

        },


        error: (error) => {

          console.error(
            'User creation error:',
            error
          );


          this.saving = false;


          this.handleError(
            error,
            'Unable to create user.'
          );


          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     OPEN EDIT USER
     ===================================================== */

  openEditUser(
    user: User
  ): void {

    this.editingUser = user;


    this.userForm = {

      email:
        user.email || '',

      username:
        user.username || '',

      first_name:
        user.first_name || '',

      last_name:
        user.last_name || '',

      password: '',

      /*
       * Keep the existing role.
       *
       * The backend controls whether
       * the role can actually be changed.
       */

      role:
        user.role || 'Requester',

      is_ai_enabled:
        user.is_ai_enabled ?? false,

      is_active:
        user.is_active ?? true

    };


    this.errorMessage = '';

    this.successMessage = '';

    this.showEditModal = true;

  }


  /* =====================================================
     CLOSE EDIT USER
     ===================================================== */

  closeEditModal(): void {

    if (this.saving) {

      return;

    }


    this.showEditModal = false;

    this.editingUser = null;

    this.errorMessage = '';

  }


  /* =====================================================
     UPDATE USER
     ===================================================== */

  updateUser(): void {

    this.errorMessage = '';

    this.successMessage = '';


    if (!this.editingUser?.id) {

      this.errorMessage =
        'Unable to identify the user.';

      return;

    }


    if (
      !this.userForm.email.trim()
    ) {

      this.errorMessage =
        'Email is required.';

      return;

    }


    /*
     * Do NOT send username.
     *
     * Your backend marks username
     * as read-only.
     *
     * Also don't send password when
     * the password field is empty.
     */

    const payload: any = {

      email:
        this.userForm.email.trim(),

      first_name:
        this.userForm.first_name.trim(),

      last_name:
        this.userForm.last_name.trim(),

      is_ai_enabled:
        this.userForm.is_ai_enabled,

      is_active:
        this.userForm.is_active

    };


    /*
     * Only send role if it was changed.
     *
     * Backend may reject role changes
     * for some users.
     */

    if (
      this.userForm.role !==
      this.editingUser.role
    ) {

      payload.role =
        this.userForm.role;

    }


    /*
     * Only send password if entered.
     */

    if (
      this.userForm.password.trim()
    ) {

      payload.password =
        this.userForm.password;

    }


    console.log(
      'Updating user:',
      this.editingUser.id
    );

    console.log(
      'Update payload:',
      payload
    );


    this.saving = true;


    this.userService
      .updateUser(
        this.editingUser.id,
        payload
      )
      .subscribe({

        next: (response) => {

          console.log(
            'User updated:',
            response
          );


          this.saving = false;

          this.showEditModal = false;

          this.editingUser = null;


          this.successMessage =
            'User updated successfully.';


          /*
           * Reload users so the table
           * displays the backend values.
           */

          this.loadUsers();

        },


        error: (error) => {

          console.error(
            'User update error:',
            error
          );


          this.saving = false;


          this.handleError(
            error,
            'Unable to update user.'
          );


          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     DELETE / DEACTIVATE USER
     ===================================================== */

  deleteUser(
    user: User
  ): void {

    if (!user?.id) {

      return;

    }


    const confirmed =
      window.confirm(
        `Deactivate ${this.getUserName(user)}?`
      );


    if (!confirmed) {

      return;

    }


    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';


    this.userService
      .deleteUser(user.id)
      .subscribe({

        next: (response) => {

          console.log(
            'User deactivated:',
            response
          );


          this.saving = false;


          this.successMessage =
            'User deactivated successfully.';


          this.loadUsers();

        },


        error: (error) => {

          console.error(
            'User deactivation error:',
            error
          );


          this.saving = false;


          this.handleError(
            error,
            'Unable to deactivate user.'
          );


          this.cdr.detectChanges();

        }

      });

  }


  /* =====================================================
     DATE
     ===================================================== */

  formatDate(
    date?: string
  ): string {

    if (!date) {

      return '—';

    }


    const parsedDate =
      new Date(date);


    if (
      isNaN(
        parsedDate.getTime()
      )
    ) {

      return '—';

    }


    return parsedDate
      .toLocaleDateString(
        'en-US',
        {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric'
        }
      );

  }


  /* =====================================================
     ERROR HANDLING
     ===================================================== */

  handleError(
    error: any,
    defaultMessage: string
  ): void {

    if (
      error.status === 400 &&
      error.error
    ) {

      const messages: string[] = [];


      Object.keys(
        error.error
      ).forEach(
        key => {

          const value =
            error.error[key];


          if (
            Array.isArray(value)
          ) {

            messages.push(
              `${key}: ${value.join(', ')}`
            );

          }

          else if (
            typeof value === 'string'
          ) {

            messages.push(
              `${key}: ${value}`
            );

          }

        }
      );


      this.errorMessage =
        messages.length > 0
          ? messages.join(' | ')
          : defaultMessage;

    }

    else if (
      error.status === 401
    ) {

      this.errorMessage =
        'Authentication failed. Please login again.';

    }

    else if (
      error.status === 403
    ) {

      this.errorMessage =
        'You do not have permission to perform this action.';

    }

    else {

      this.errorMessage =
        defaultMessage;

    }

  }


  /* =====================================================
     TRACK
     ===================================================== */

  trackByUser(
    index: number,
    user: User
  ): number {

    return user.id;

  }

}