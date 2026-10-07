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
     AI ACCESS RULE
     ===================================================== */

  canUseAI(role?: string): boolean {

    const normalizedRole = String(role || '')
      .trim()
      .toLowerCase();

    return (
      normalizedRole === 'admin' ||
      normalizedRole === 'team member' ||
      normalizedRole === 'teammate'
    );
  }


  /* =====================================================
     NORMALIZE AI ACCESS
     ===================================================== */

  private normalizeAIAccess(user: User): User {

    user.is_ai_enabled =
      this.canUseAI(user.role);

    return user;
  }


  /* =====================================================
     FIND LOGGED-IN USER
     ===================================================== */

  private getLoggedInUser(): any {

    const commonKeys = [
      'user',
      'User',
      'currentUser',
      'current_user',
      'authUser',
      'auth_user',
      'loggedInUser',
      'logged_in_user',
      'current_user_data',
      'userData',
      'user_data',
      'profile',
      'userProfile'
    ];


    for (const key of commonKeys) {

      const result =
        this.readLocalStorageValue(key);

      const user =
        this.extractUserObject(result);

      if (user) {

        console.log(
          'Logged-in user found:',
          user
        );

        return user;
      }
    }


    for (
      let index = 0;
      index < localStorage.length;
      index++
    ) {

      const key =
        localStorage.key(index);

      if (!key) {
        continue;
      }


      const value =
        this.readLocalStorageValue(key);

      const user =
        this.findUserInsideObject(value);

      if (user) {

        console.log(
          `Logged-in user found in localStorage key "${key}":`,
          user
        );

        return user;
      }
    }


    const jwtUser =
      this.findUserFromJwt();

    if (jwtUser) {

      console.log(
        'Logged-in user found from JWT:',
        jwtUser
      );

      return jwtUser;
    }


    console.warn(
      'Unable to determine logged-in user from frontend storage.'
    );

    return null;
  }


  /* =====================================================
     READ LOCAL STORAGE VALUE
     ===================================================== */

  private readLocalStorageValue(
    key: string
  ): any {

    try {

      const value =
        localStorage.getItem(key);

      if (!value) {
        return null;
      }


      try {

        return JSON.parse(value);

      } catch {

        return value;
      }

    } catch (error) {

      console.warn(
        `Unable to read localStorage key "${key}"`,
        error
      );

      return null;
    }
  }


  /* =====================================================
     EXTRACT USER OBJECT
     ===================================================== */

  private extractUserObject(
    value: any
  ): any {

    if (!value) {
      return null;
    }


    if (
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {

      if (
        value.username ||
        value.email ||
        value.user_id ||
        value.userId
      ) {

        return value;
      }


      const nestedKeys = [
        'user',
        'currentUser',
        'current_user',
        'profile',
        'data',
        'account'
      ];


      for (const key of nestedKeys) {

        if (value[key]) {

          const nested =
            this.extractUserObject(
              value[key]
            );

          if (nested) {
            return nested;
          }
        }
      }
    }


    return null;
  }


  /* =====================================================
     FIND USER INSIDE ANY OBJECT
     ===================================================== */

  private findUserInsideObject(
    value: any
  ): any {

    if (!value) {
      return null;
    }


    if (typeof value === 'string') {

      if (
        value.trim().startsWith('{')
      ) {

        try {

          const parsed =
            JSON.parse(value);

          return this.findUserInsideObject(
            parsed
          );

        } catch {

          return null;
        }
      }

      return null;
    }


    if (Array.isArray(value)) {

      for (const item of value) {

        const found =
          this.findUserInsideObject(item);

        if (found) {
          return found;
        }
      }

      return null;
    }


    if (
      typeof value === 'object'
    ) {

      if (
        value.username ||
        value.email
      ) {

        if (
          value.role ||
          value.id ||
          value.user_id ||
          value.userId
        ) {

          return value;
        }
      }


      for (
        const key of Object.keys(value)
      ) {

        const lowerKey =
          key.toLowerCase();

        if (
          lowerKey.includes('token') ||
          lowerKey.includes('password')
        ) {
          continue;
        }


        const found =
          this.findUserInsideObject(
            value[key]
          );

        if (found) {
          return found;
        }
      }
    }


    return null;
  }


  /* =====================================================
     FIND USER FROM JWT
     ===================================================== */

  private findUserFromJwt(): any {

    const tokenKeys = [
      'access',
      'accessToken',
      'access_token',
      'token',
      'jwt',
      'refresh',
      'refreshToken',
      'refresh_token'
    ];


    for (const key of tokenKeys) {

      const token =
        localStorage.getItem(key);

      if (!token) {
        continue;
      }


      const payload =
        this.decodeJwt(token);

      if (!payload) {
        continue;
      }


      if (
        payload.username ||
        payload.email ||
        payload.user_id ||
        payload.userId
      ) {

        return payload;
      }


      const nested =
        this.findUserInsideObject(
          payload
        );

      if (nested) {
        return nested;
      }
    }


    return null;
  }


  /* =====================================================
     DECODE JWT
     ===================================================== */

  private decodeJwt(
    token: string
  ): any {

    try {

      const parts =
        token.split('.');

      if (parts.length !== 3) {
        return null;
      }


      let payload =
        parts[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/');


      while (
        payload.length % 4 !== 0
      ) {

        payload += '=';
      }


      return JSON.parse(
        atob(payload)
      );

    } catch {

      return null;
    }
  }


  /* =====================================================
     GET CURRENT ADMIN IDENTITY
     ===================================================== */

  private getCurrentAdminIdentity(): {
    id: string | null;
    username: string | null;
    email: string | null;
  } {

    const currentUser =
      this.getLoggedInUser();


    if (!currentUser) {

      return {
        id: null,
        username: null,
        email: null
      };
    }


    const id =
      currentUser.id ??
      currentUser.user_id ??
      currentUser.userId ??
      null;


    const username =
      currentUser.username ??
      currentUser.user_name ??
      currentUser.userName ??
      null;


    const email =
      currentUser.email ??
      currentUser.email_address ??
      null;


    return {

      id:
        id !== null
          ? String(id)
          : null,

      username:
        username
          ? String(username)
              .trim()
              .toLowerCase()
          : null,

      email:
        email
          ? String(email)
              .trim()
              .toLowerCase()
          : null
    };
  }


  /* =====================================================
     FILTER ADMIN USERS
     ===================================================== */

  private filterUsersForAdminPortal(
    users: User[]
  ): User[] {

    const currentAdmin =
      this.getCurrentAdminIdentity();


    const nonAdminUsers =
      users.filter(
        (user: any) => {

          const role =
            String(
              user.role || ''
            )
              .trim()
              .toLowerCase();

          return role !== 'admin';
        }
      );


    const adminUsers =
      users.filter(
        (user: any) => {

          const role =
            String(
              user.role || ''
            )
              .trim()
              .toLowerCase();

          return role === 'admin';
        }
      );


    if (
      currentAdmin.id ||
      currentAdmin.username ||
      currentAdmin.email
    ) {

      const currentAdminUser =
        adminUsers.find(
          (user: any) => {

            const userId =
              user.id !== undefined &&
              user.id !== null
                ? String(user.id)
                : null;


            const username =
              user.username
                ? String(user.username)
                    .trim()
                    .toLowerCase()
                : null;


            const email =
              user.email
                ? String(user.email)
                    .trim()
                    .toLowerCase()
                : null;


            return (
              (
                !!currentAdmin.id &&
                !!userId &&
                currentAdmin.id === userId
              ) ||
              (
                !!currentAdmin.username &&
                !!username &&
                currentAdmin.username === username
              ) ||
              (
                !!currentAdmin.email &&
                !!email &&
                currentAdmin.email === email
              )
            );
          }
        );


      if (currentAdminUser) {

        return [
          currentAdminUser,
          ...nonAdminUsers
        ];
      }
    }


    const fallbackAdmin =
      adminUsers.find(
        (user: any) => {

          const username =
            String(
              user.username || ''
            )
              .trim()
              .toLowerCase();


          const email =
            String(
              user.email || ''
            )
              .trim()
              .toLowerCase();


          return (
            username === 's' ||
            email === 's@gmail.com'
          );
        }
      );


    if (fallbackAdmin) {

      return [
        fallbackAdmin,
        ...nonAdminUsers
      ];
    }


    return nonAdminUsers;
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

          const allUsers: User[] =
            Array.isArray(response)
              ? response
              : [];


          /*
           * STRICT AI RULE
           *
           * Admin       -> Enabled
           * Team Member -> Enabled
           * Requester   -> Disabled
           */
          allUsers.forEach(
            (user: User) => {
              this.normalizeAIAccess(user);
            }
          );


          this.users =
            this.filterUsersForAdminPortal(
              allUsers
            );


          this.users.forEach(
            (user: User) => {
              this.normalizeAIAccess(user);
            }
          );


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

          } else if (error.status === 403) {

            this.errorMessage =
              'Only Admin users can view User Management.';

          } else {

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


    const allowedRoles = [
      'Requester',
      'Team Member'
    ];


    if (
      !allowedRoles.includes(
        this.userForm.role
      )
    ) {

      this.errorMessage =
        'Invalid user role.';

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


    const role =
      user.role || 'Requester';


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

      role:
        role,

      /*
       * Do not trust old database value.
       * AI is based on role.
       */
      is_ai_enabled:
        this.canUseAI(role),

      is_active:
        user.is_active ?? true
    };


    this.errorMessage = '';

    this.successMessage = '';

    this.showEditModal = true;
  }


  /* =====================================================
     ROLE CHANGE
     ===================================================== */

  onRoleChange(): void {

    this.userForm.is_ai_enabled =
      this.canUseAI(
        this.userForm.role
      );
  }


  /* =====================================================
     CLOSE EDIT
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
     * STRICT RULE:
     *
     * Admin       -> true
     * Team Member -> true
     * Requester   -> false
     */
    const aiEnabled =
      this.canUseAI(
        this.userForm.role
      );


    this.userForm.is_ai_enabled =
      aiEnabled;


    const payload: any = {

      email:
        this.userForm.email.trim(),

      first_name:
        this.userForm.first_name.trim(),

      last_name:
        this.userForm.last_name.trim(),

      is_ai_enabled:
        aiEnabled,

      is_active:
        this.userForm.is_active
    };


    if (
      this.userForm.role !==
      this.editingUser.role
    ) {

      payload.role =
        this.userForm.role;
    }


    if (
      this.userForm.password.trim()
    ) {

      payload.password =
        this.userForm.password;
    }


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

          } else if (
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

    } else if (
      error.status === 401
    ) {

      this.errorMessage =
        'Authentication failed. Please login again.';

    } else if (
      error.status === 403
    ) {

      this.errorMessage =
        'You do not have permission to perform this action.';

    } else {

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