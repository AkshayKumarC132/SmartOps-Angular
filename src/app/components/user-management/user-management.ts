
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  User,
  UserService,
  RegistrationRole
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
     AI ACCESS
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

  private normalizeAIAccess(user: User): User {
    user.is_ai_enabled = this.canUseAI(user.role);
    return user;
  }

  /* =====================================================
     LOCAL STORAGE HELPERS
     ===================================================== */

  private readLocalStorageValue(key: string): any {
    try {
      const value = localStorage.getItem(key);

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

  private extractUserObject(value: any): any {
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
          const nested = this.extractUserObject(value[key]);

          if (nested) {
            return nested;
          }
        }
      }
    }

    return null;
  }

  private findUserInsideObject(value: any): any {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      if (value.trim().startsWith('{')) {
        try {
          return this.findUserInsideObject(
            JSON.parse(value)
          );
        } catch {
          return null;
        }
      }

      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findUserInsideObject(item);

        if (found) {
          return found;
        }
      }

      return null;
    }

    if (typeof value === 'object') {
      if (
        (value.username || value.email) &&
        (
          value.role ||
          value.id ||
          value.user_id ||
          value.userId
        )
      ) {
        return value;
      }

      for (const key of Object.keys(value)) {
        const lowerKey = key.toLowerCase();

        if (
          lowerKey.includes('token') ||
          lowerKey.includes('password')
        ) {
          continue;
        }

        const found = this.findUserInsideObject(value[key]);

        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');

      if (parts.length !== 3) {
        return null;
      }

      let payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      while (payload.length % 4 !== 0) {
        payload += '=';
      }

      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

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
      const token = localStorage.getItem(key);

      if (!token) {
        continue;
      }

      const payload = this.decodeJwt(token);

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

      const nested = this.findUserInsideObject(payload);

      if (nested) {
        return nested;
      }
    }

    return null;
  }

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
      const result = this.readLocalStorageValue(key);
      const user = this.extractUserObject(result);

      if (user) {
        return user;
      }
    }

    for (
      let index = 0;
      index < localStorage.length;
      index++
    ) {
      const key = localStorage.key(index);

      if (!key) {
        continue;
      }

      const user = this.findUserInsideObject(
        this.readLocalStorageValue(key)
      );

      if (user) {
        return user;
      }
    }

    return this.findUserFromJwt();
  }

  private getCurrentAdminIdentity(): {
    id: string | null;
    username: string | null;
    email: string | null;
  } {
    const currentUser = this.getLoggedInUser();

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
      id: id !== null ? String(id) : null,
      username: username
        ? String(username).trim().toLowerCase()
        : null,
      email: email
        ? String(email).trim().toLowerCase()
        : null
    };
  }

  /* =====================================================
     FILTER USERS FOR ADMIN PORTAL
     ===================================================== */

  private filterUsersForAdminPortal(
    users: User[]
  ): User[] {
    const currentAdmin = this.getCurrentAdminIdentity();

    const nonAdminUsers = users.filter(user =>
      String(user.role || '').trim().toLowerCase() !== 'admin'
    );

    const adminUsers = users.filter(user =>
      String(user.role || '').trim().toLowerCase() === 'admin'
    );

    if (
      currentAdmin.id ||
      currentAdmin.username ||
      currentAdmin.email
    ) {
      const currentAdminUser = adminUsers.find(user => {
        const userId =
          user.id !== undefined && user.id !== null
            ? String(user.id)
            : null;

        const username = user.username
          ? user.username.trim().toLowerCase()
          : null;

        const email = user.email
          ? user.email.trim().toLowerCase()
          : null;

        return (
          (!!currentAdmin.id &&
            !!userId &&
            currentAdmin.id === userId) ||
          (!!currentAdmin.username &&
            !!username &&
            currentAdmin.username === username) ||
          (!!currentAdmin.email &&
            !!email &&
            currentAdmin.email === email)
        );
      });

      if (currentAdminUser) {
        return [
          currentAdminUser,
          ...nonAdminUsers
        ];
      }
    }

    const fallbackAdmin = adminUsers.find(user => {
      const username = String(user.username || '')
        .trim()
        .toLowerCase();

      const email = String(user.email || '')
        .trim()
        .toLowerCase();

      return (
        username === 's' ||
        email === 's@gmail.com'
      );
    });

    return fallbackAdmin
      ? [fallbackAdmin, ...nonAdminUsers]
      : nonAdminUsers;
  }

  /* =====================================================
     LOAD USERS
     Hide inactive users in the frontend.
     ===================================================== */

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getUsers().subscribe({
      next: response => {
        const allUsers: User[] = Array.isArray(response)
          ? response
          : [];

        // Frontend-only filtering: hide inactive users.
        const activeUsers = allUsers.filter(
          user => user.is_active === true
        );

        // Preserve organization-admin display filtering.
        this.users = this.filterUsersForAdminPortal(
          activeUsers
        );

        // Preserve existing AI access behavior.
        this.users.forEach(user => {
          this.normalizeAIAccess(user);
        });

        this.loading = false;
        this.cdr.detectChanges();
      },

      error: error => {
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
          this.errorMessage = 'Unable to load users.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  /* =====================================================
     SEARCH AND ROLE FILTER
     ===================================================== */

  get filteredUsers(): User[] {
    let result = [...this.users];

    const search = this.searchText.trim().toLowerCase();

    if (search) {
      result = result.filter(user => {
        const username = user.username?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        const firstName =
          user.first_name?.toLowerCase() || '';
        const lastName =
          user.last_name?.toLowerCase() || '';

        return (
          username.includes(search) ||
          email.includes(search) ||
          firstName.includes(search) ||
          lastName.includes(search)
        );
      });
    }

    if (this.selectedRole !== 'All') {
      result = result.filter(
        user => user.role === this.selectedRole
      );
    }

    return result;
  }

  get roles(): string[] {
    const roleSet = new Set<string>();

    this.users.forEach(user => {
      if (user.role) {
        roleSet.add(user.role);
      }
    });

    return Array.from(roleSet);
  }

  /* =====================================================
     DISPLAY HELPERS
     ===================================================== */

  getUserName(user: User): string {
    const fullName =
      `${user.first_name || ''} ${user.last_name || ''}`.trim();

    return fullName || user.username || 'User';
  }

  getInitial(user: User): string {
    const name =
      user.username ||
      user.first_name ||
      'U';

    return name.charAt(0).toUpperCase();
  }

  getRoleClass(role: string): string {
    switch (role?.toLowerCase()) {
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

  formatDate(date?: string): string {
    if (!date) {
      return '—';
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return '—';
    }

    return parsedDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  }

  trackByUser(index: number, user: User): number {
    return user.id;
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

  closeInviteModal(): void {
    if (this.saving) {
      return;
    }

    this.showInviteModal = false;
    this.errorMessage = '';
  }

  /* =====================================================
     CREATE USER
     Uses POST /auth/register/
     ===================================================== */

  createUser(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.userForm.email.trim()) {
      this.errorMessage = 'Email is required.';
      return;
    }

    if (!this.userForm.username.trim()) {
      this.errorMessage = 'Username is required.';
      return;
    }

    if (!this.userForm.password) {
      this.errorMessage = 'Password is required.';
      return;
    }

    if (this.userForm.password.length < 7) {
      this.errorMessage =
        'Password must contain at least 7 characters.';
      return;
    }

    const role = this.userForm.role;

    if (
      role !== 'Requester' &&
      role !== 'Team Member'
    ) {
      this.errorMessage = 'Invalid user role.';
      return;
    }

    const payload: {
      username: string;
      email: string;
      password: string;
      role: RegistrationRole;
      first_name?: string;
      last_name?: string;
    } = {
      username: this.userForm.username.trim(),
      email: this.userForm.email.trim(),
      password: this.userForm.password,
      role,
      first_name: this.userForm.first_name.trim(),
      last_name: this.userForm.last_name.trim()
    };

    this.saving = true;

    this.userService.registerUser(payload).subscribe({
      next: response => {
        console.log('User created:', response);

        this.saving = false;
        this.showInviteModal = false;
        this.successMessage = 'User created successfully.';

        // Refresh the displayed list.
        this.loadUsers();
        this.cdr.detectChanges();
      },

      error: error => {
        console.error('User creation error:', error);

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
     EDIT USER
     ===================================================== */

  openEditUser(user: User): void {
    this.editingUser = user;

    const role = user.role || 'Requester';

    this.userForm = {
      email: user.email || '',
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      password: '',
      role,
      is_ai_enabled: this.canUseAI(role),
      is_active: user.is_active ?? true
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.showEditModal = true;
  }

  onRoleChange(): void {
    this.userForm.is_ai_enabled = this.canUseAI(
      this.userForm.role
    );
  }

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
      this.errorMessage = 'Unable to identify the user.';
      return;
    }

    if (!this.userForm.email.trim()) {
      this.errorMessage = 'Email is required.';
      return;
    }

    const aiEnabled = this.canUseAI(
      this.userForm.role
    );

    this.userForm.is_ai_enabled = aiEnabled;

    const payload: any = {
      email: this.userForm.email.trim(),
      first_name: this.userForm.first_name.trim(),
      last_name: this.userForm.last_name.trim(),
      is_ai_enabled: aiEnabled,
      is_active: this.userForm.is_active
    };

    if (this.userForm.role !== this.editingUser.role) {
      payload.role = this.userForm.role;
    }

    if (this.userForm.password.trim()) {
      if (this.userForm.password.length < 7) {
        this.errorMessage =
          'Password must contain at least 7 characters.';
        return;
      }

      payload.password = this.userForm.password;
    }

    this.saving = true;

    this.userService.updateUser(
      this.editingUser.id,
      payload
    ).subscribe({
      next: response => {
        console.log('User updated:', response);

        this.saving = false;
        this.showEditModal = false;
        this.editingUser = null;
        this.successMessage = 'User updated successfully.';

        // Reload and apply active-user filtering.
        this.loadUsers();
        this.cdr.detectChanges();
      },

      error: error => {
        console.error('User update error:', error);

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
     DELETE USER
     Sends DELETE to the existing backend endpoint.
     Updates the frontend list only after success.
     ===================================================== */

  deleteUser(user: User): void {
    if (!user?.id) {
      this.errorMessage = 'Unable to identify the user.';
      return;
    }

    if (this.saving) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${this.getUserName(user)}?`
    );

    if (!confirmed) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.deleteUser(user.id).subscribe({
      next: response => {
        console.log('Delete response:', response);

        // Remove the user from the displayed list.
        this.users = this.users.filter(
          item => item.id !== user.id
        );

        // Clear the edit modal if this user was being edited.
        if (this.editingUser?.id === user.id) {
          this.editingUser = null;
          this.showEditModal = false;
        }

        this.saving = false;
        this.successMessage =
          'User removed from the displayed list successfully.';

        this.cdr.detectChanges();
      },

      error: error => {
        console.error(
          'User deletion request failed:',
          error
        );

        this.saving = false;

        this.handleError(
          error,
          'Unable to delete user.'
        );

        this.cdr.detectChanges();
      }
    });
  }

  /* =====================================================
     ERROR HANDLING
     ===================================================== */

  handleError(
    error: any,
    defaultMessage: string
  ): void {
    if (error.status === 400 && error.error) {
      const messages: string[] = [];

      Object.keys(error.error).forEach(key => {
        const value = error.error[key];

        if (Array.isArray(value)) {
          messages.push(
            `${key}: ${value.join(', ')}`
          );
        } else if (typeof value === 'string') {
          messages.push(`${key}: ${value}`);
        }
      });

      this.errorMessage = messages.length
        ? messages.join(' | ')
        : defaultMessage;

    } else if (error.status === 401) {
      this.errorMessage =
        'Authentication failed. Please login again.';

    } else if (error.status === 403) {
      this.errorMessage =
        'You do not have permission to perform this action.';

    } else if (error.status === 404) {
      this.errorMessage =
        'The requested endpoint was not found.';

    } else if (error.status === 405) {
      this.errorMessage =
        'This HTTP method is not allowed for the requested endpoint.';

    } else if (error.status === 0) {
      this.errorMessage =
        'Unable to connect to the backend server.';

    } else if (error.status >= 500) {
      this.errorMessage =
        'The backend encountered an error. Check the Django server logs.';

    } else {
      this.errorMessage = defaultMessage;
    }
  }
}
