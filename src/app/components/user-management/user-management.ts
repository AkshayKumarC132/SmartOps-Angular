import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  User,
  UserService,
  RegistrationRole
} from '../../services/user.service';

import { ApiErrorService } from '../../services/api-error.service';
import { OrganizationContextService } from '../../services/organization-context.service';
import Swal from 'sweetalert2';

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
  showUserDetailsModal = false;
  loadingUserDetails = false;
  detailsErrorMessage = '';

  selectedUserDetails: User | null = null;
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
    private apiErrorService: ApiErrorService,
    private cdr: ChangeDetectorRef,
    private organizationContextService: OrganizationContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // =====================================================
  // AI ACCESS
  // =====================================================

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

  // =====================================================
  // LOCAL STORAGE HELPERS
  // =====================================================

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
        value.Username ||
        value.email ||
        value.Email ||
        value.user_id ||
        value.userId ||
        value.Id ||
        value.ID ||
        value['User Id']
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
        (
          value.username ||
          value.Username ||
          value.email ||
          value.Email
        ) &&
        (
          value.role ||
          value.Role ||
          value.id ||
          value.Id ||
          value.ID ||
          value.user_id ||
          value.userId ||
          value['User Id']
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
        payload.Username ||
        payload.email ||
        payload.Email ||
        payload.user_id ||
        payload.userId ||
        payload.Id ||
        payload.ID ||
        payload['User Id']
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
      currentUser.ID ??
      currentUser.Id ??
      currentUser.user_id ??
      currentUser.userId ??
      currentUser['User Id'] ??
      null;

    const username =
      currentUser.username ??
      currentUser.Username ??
      currentUser.user_name ??
      currentUser.userName ??
      null;

    const email =
      currentUser.email ??
      currentUser.Email ??
      currentUser.email_address ??
      null;

    return {
      id:
        id !== null && id !== undefined
          ? String(id).trim()
          : null,
      username: username
        ? String(username).trim().toLowerCase()
        : null,
      email: email
        ? String(email).trim().toLowerCase()
        : null
    };
  }

  // =====================================================
  // ADMIN PORTAL USER FILTERING
  // =====================================================

  private filterUsersForAdminPortal(
    users: User[]
  ): User[] {
    const organizationFilteredUsers =
      this.organizationContextService.filterRecords(
        users as unknown as (User & Record<string, unknown>)[]
      );

    const currentAdmin = this.getCurrentAdminIdentity();

    const nonAdminUsers = organizationFilteredUsers.filter(
      user =>
        String(user.role || '').trim().toLowerCase() !== 'admin'
    );

    const adminUsers = organizationFilteredUsers.filter(
      user =>
        String(user.role || '').trim().toLowerCase() === 'admin'
    );

    const matchingAdmin = adminUsers.find(user => {
      const rawUser = user as User & Record<string, unknown>;

      const userIdValue =
        rawUser.id ??
        rawUser['ID'] ??
        rawUser['Id'] ??
        rawUser['user_id'] ??
        rawUser['userId'] ??
        rawUser['User Id'];

      const userId =
        userIdValue !== null && userIdValue !== undefined
          ? String(userIdValue).trim()
          : null;

      const username = String(
        rawUser.username ?? rawUser['Username'] ?? ''
      ).trim().toLowerCase();

      const email = String(
        rawUser.email ?? rawUser['Email'] ?? ''
      ).trim().toLowerCase();

      return (
        (!!currentAdmin.id &&
          !!userId &&
          currentAdmin.id === userId) ||
        (!!currentAdmin.username &&
          currentAdmin.username === username) ||
        (!!currentAdmin.email &&
          currentAdmin.email === email)
      );
    });

    // Never substitute a hardcoded administrator.
    return matchingAdmin
      ? [matchingAdmin, ...nonAdminUsers]
      : nonAdminUsers;
  }

  // =====================================================
  // LOAD USERS
  // =====================================================

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getUsers().subscribe({
      next: response => {
        const allUsers: User[] = Array.isArray(response)
          ? response
          : [];

        // Keep active and inactive accounts visible in User Management.
        this.users = this.filterUsersForAdminPortal(allUsers);

        // Preserve existing AI-access behavior.
        this.users.forEach(user => {
          this.normalizeAIAccess(user);
        });

        this.loading = false;
        this.cdr.detectChanges();
      },

      error: error => {
        console.error('User Management Error:', error);

        this.users = [];
        this.loading = false;

        if (error?.status === 401) {
          this.errorMessage =
            'Authentication failed. Please login again.';
        } else if (error?.status === 403) {
          this.errorMessage =
            'Only Admin users can view User Management.';
        } else {
          this.errorMessage =
            this.apiErrorService.getErrorMessage(error);
        }

        this.cdr.detectChanges();
      }
    });
  }

  // =====================================================
  // SEARCH AND ROLE FILTER
  // =====================================================

  get filteredUsers(): User[] {
    let result = [...this.users];

    const search = this.searchText.trim().toLowerCase();

    if (search) {
      result = result.filter(user => {
        const username = user.username?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        const firstName = user.first_name?.toLowerCase() || '';
        const lastName = user.last_name?.toLowerCase() || '';

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

  // =====================================================
  // DISPLAY HELPERS
  // =====================================================

  getUserName(user: User): string {
    const fullName =
      `${user.first_name || ''} ${user.last_name || ''}`.trim();

    return fullName || user.username || 'User';
  }
  
// =====================================================
// VIEW USER INFORMATION
// =====================================================

openUserDetails(user: User): void {
  if (!user?.id) {
    return;
  }

  this.selectedUserDetails = { ...user };
  this.showUserDetailsModal = true;
  this.loadingUserDetails = true;
  this.detailsErrorMessage = '';

  this.userService.getUser(user.id).subscribe({
    next: response => {
      this.selectedUserDetails =
        this.normalizeAIAccess(response);

      this.loadingUserDetails = false;
      this.cdr.detectChanges();
    },

    error: error => {
      console.error('User details error:', error);

      this.loadingUserDetails = false;

      this.detailsErrorMessage =
        this.apiErrorService.getErrorMessage(error) ||
        'Unable to refresh user information.';

      this.cdr.detectChanges();
    }
  });
}

closeUserDetailsModal(): void {
  this.showUserDetailsModal = false;
  this.selectedUserDetails = null;
  this.loadingUserDetails = false;
  this.detailsErrorMessage = '';
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

  // =====================================================
  // INVITE USER
  // =====================================================

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

  // =====================================================
  // CREATE USER
  // Uses existing POST /auth/register/ service method.
  // =====================================================

  createUser(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.saving) {
      return;
    }

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
      this.errorMessage = 'Password must contain at least 7 characters.';
      return;
    }

    const role = this.userForm.role;
    if (role !== 'Requester' && role !== 'Team Member') {
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

    Swal.fire({
      title: 'Create User?',
      text: `Create the account for ${payload.username}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Create User',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#64748b',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.saving = true;
      this.userService.registerUser(payload).subscribe({
        next: () => {
          this.saving = false;
          this.showInviteModal = false;
          this.successMessage = 'User created successfully.';
          this.loadUsers();
          this.cdr.detectChanges();

          Swal.fire({
            title: 'User Created!',
            text: `${payload.username} has been created successfully.`,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0d9488'
          });
        },
        error: error => {
          console.error('User creation error:', error);
          this.saving = false;
          this.handleError(error, 'Unable to create user.');
          this.cdr.detectChanges();

          Swal.fire({
            title: 'Creation Failed',
            text: this.errorMessage || 'Unable to create user.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc2626'
          });
        }
      });
    });
  }

  // =====================================================
  // EDIT USER
  // =====================================================

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

  // =====================================================
  // UPDATE USER
  // =====================================================

  updateUser(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.saving) {
      return;
    }

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

        this.loadUsers();
        this.cdr.detectChanges();
      },

      error: error => {
        console.error('User update error:', error);

        this.saving = false;
        this.handleError(error, 'Unable to update user.');
        this.cdr.detectChanges();
      }
    });
  }

  // =====================================================
  // ACTIVATE / DEACTIVATE USER
  // =====================================================

  toggleUserStatus(user: User): void {
    if (!user?.id || this.saving) {
      return;
    }

    const activate = user.is_active === false;

    Swal.fire({
      title: activate ? 'Activate User?' : 'Deactivate User?',
      text: activate
        ? `Activate ${this.getUserName(user)}? They will be able to access SmartOps again.`
        : `Deactivate ${this.getUserName(user)}? They will no longer be able to access SmartOps.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: activate ? 'Yes, Activate' : 'Yes, Deactivate',
      cancelButtonText: 'Cancel',
      confirmButtonColor: activate ? '#0d9488' : '#d97706',
      cancelButtonColor: '#64748b',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.userService.updateUser(user.id, {
        is_active: activate
      }).subscribe({
        next: () => {
          user.is_active = activate;
          this.saving = false;
          this.successMessage = activate
            ? 'User activated successfully.'
            : 'User deactivated successfully.';
          this.cdr.detectChanges();

          Swal.fire({
            title: activate ? 'User Activated' : 'User Deactivated',
            text: `${this.getUserName(user)} has been ${activate ? 'activated' : 'deactivated'}.`,
            icon: 'success',
            confirmButtonColor: '#0d9488'
          });
        },
        error: error => {
          this.saving = false;
          this.handleError(
            error,
            activate ? 'Unable to activate user.' : 'Unable to deactivate user.'
          );
          this.cdr.detectChanges();

          Swal.fire({
            title: 'Action Failed',
            text: this.errorMessage || 'Unable to update user status.',
            icon: 'error',
            confirmButtonColor: '#dc2626'
          });
        }
      });
    });
  }

  // =====================================================
  // PERMANENTLY DELETE USER
  // =====================================================

  deleteUser(user: User): void {
    if (!user?.id) {
      Swal.fire({
        title: 'Unable to Delete',
        text: 'Unable to identify the user.',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    if (this.saving) {
      return;
    }

    Swal.fire({
      title: 'Permanently Delete User?',
      text: `Permanently delete ${this.getUserName(user)}? This cannot be undone. Existing ticket history may prevent deletion.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Permanently Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.userService.deleteUser(user.id, 'permanent_delete').subscribe({
        next: () => {
          this.users = this.users.filter(item => item.id !== user.id);

          if (this.editingUser?.id === user.id) {
            this.editingUser = null;
            this.showEditModal = false;
          }

          this.saving = false;
          this.successMessage = 'User permanently deleted.';
          this.cdr.detectChanges();

          Swal.fire({
            title: 'User Deleted',
            text: `${this.getUserName(user)} was permanently deleted.`,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0d9488'
          });
        },
        error: error => {
          console.error('Permanent deletion failed:', error);
          this.saving = false;
          this.handleError(error, 'Unable to permanently delete user.');
          this.cdr.detectChanges();

          Swal.fire({
            icon: 'error',
            title: 'Deletion Failed',
            text: error.error?.message || error.error?.detail || 'Unable to delete user.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#dc2626'
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigateByUrl('/user-management');
            }
          });
        }
      });

    });
  }

  // =====================================================
  // SHARED ERROR HANDLING
  // =====================================================

  handleError(
    error: unknown,
    defaultMessage: string
  ): void {
    const httpError = error as {
      status?: number;
      error?: unknown;
    };

    // Preserve readable Django field-validation errors.
    if (
      httpError?.status === 400 &&
      httpError.error &&
      typeof httpError.error === 'object' &&
      !Array.isArray(httpError.error)
    ) {
      const messages: string[] = [];
      const responseBody =
        httpError.error as Record<string, unknown>;

      Object.keys(responseBody).forEach(key => {
        const value = responseBody[key];

        if (Array.isArray(value)) {
          const items = value.map(item => String(item));
          messages.push(`${key}: ${items.join(', ')}`);
        } else if (
          typeof value === 'string' &&
          value.trim()
        ) {
          messages.push(`${key}: ${value}`);
        }
      });

      this.errorMessage = messages.length
        ? messages.join(' | ')
        : this.apiErrorService.getErrorMessage(error);

      if (!this.errorMessage) {
        this.errorMessage = defaultMessage;
      }

      return;
    }

    this.errorMessage =
      this.apiErrorService.getErrorMessage(error) ||
      defaultMessage;
  }
}