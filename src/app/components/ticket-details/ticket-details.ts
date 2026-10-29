
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { TicketService } from '../../services/ticket.service';
import { ApiErrorService } from '../../services/api-error.service';

import {
  UserService,
  User
} from '../../services/user.service';

import { OrganizationContextService } from '../../services/organization-context.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-ticket-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-details.html',
  styleUrl: './ticket-details.css'
})
export class TicketDetails implements OnInit {
  ticket: any = null;
  ticketId: number | null = null;
  users: User[] = [];

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  isEditing = false;
  editStatus = '';
  editPriority = '';

  selectedAssigneeId: number | null = null;
  assigning = false;
  assignmentMessage = '';
  assignmentError = false;

  statusToSave = '';
  statusSaving = false;
  statusMessage = '';
  statusError = false;

  priorityToSave = '';
  prioritySaving = false;
  priorityMessage = '';
  priorityError = false;

  statusOptions: string[] = [
    'Open',
    'Assigned',
    'In_Progress',
    'Resolved',
    'Closed',
    'ReOpened'
  ];

  priorityOptions: string[] = [
    'Low',
    'Medium',
    'High',
    'Critical'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private apiErrorService: ApiErrorService,
    private userService: UserService,
    private organizationContext: OrganizationContextService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();

    const id = this.route.snapshot.paramMap.get('id');

    if (!id || id.trim() === '') {
      this.loading = false;
      this.errorMessage = 'Ticket ID was not found.';
      return;
    }

    const parsedId = Number(id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      this.loading = false;
      this.errorMessage = 'Invalid ticket ID.';
      return;
    }

    this.ticketId = parsedId;
    this.loadTicket(parsedId);
  }

  // Admin role check
  get isAdmin(): boolean {
    const user = this.authService.getUser();

    const role = String(
      user?.Role ??
      user?.role ??
      user?.['user_role'] ??
      ''
    ).trim().toLowerCase();

    return [
      'admin',
      'organization admin',
      'organisation admin',
      'superuser'
    ].includes(role);
  }

  // Load active Team Members in the current organization.
  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (response: any) => {
        let userList: User[] = [];

        if (Array.isArray(response)) {
          userList = response;
        } else if (Array.isArray(response?.results)) {
          userList = response.results;
        } else if (Array.isArray(response?.users)) {
          userList = response.users;
        } else if (Array.isArray(response?.data)) {
          userList = response.data;
        }

        const activeUsers = userList.filter(
          user => user.is_active !== false
        );

        const organizationUsers =
          this.organizationContext.filterRecords(activeUsers);

        this.users = organizationUsers.filter(
          user =>
            String(user.role || '').trim().toLowerCase() === 'team member'
        );

        if (this.ticket) {
          this.setCurrentAssignee();
        }

        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Failed to load users:', error);
        this.users = [];
        this.cdr.detectChanges();
      }
    });
  }

  private getAssignedUserId(): number | null {
    const assigned =
      this.ticket?.assigned_to ??
      this.ticket?.assigned_to_id ??
      null;

    if (assigned === null || assigned === undefined || assigned === '') {
      return null;
    }

    if (typeof assigned === 'object') {
      const id = assigned.id ?? assigned.pk;
      return id !== null && id !== undefined ? Number(id) : null;
    }

    if (
      typeof assigned === 'number' ||
      /^\d+$/.test(String(assigned))
    ) {
      return Number(assigned);
    }

    const matchingUser = this.users.find(
      user =>
        user.username === assigned ||
        user.email === assigned
    );

    return matchingUser ? Number(matchingUser.id) : null;
  }

  setCurrentAssignee(): void {
    this.selectedAssigneeId = this.getAssignedUserId();
  }

  getAssignedUserName(): string {
    const assigned =
      this.ticket?.assigned_to ??
      this.ticket?.assigned_to_id ??
      this.ticket?.assigned_to_username ??
      this.ticket?.assigned_to_name ??
      null;

    if (assigned === null || assigned === undefined || assigned === '') {
      return 'Unassigned';
    }

    if (typeof assigned === 'object') {
      const fullName = [
        assigned.first_name,
        assigned.last_name
      ].filter(Boolean).join(' ').trim();

      return (
        fullName ||
        assigned.username ||
        assigned.name ||
        assigned.email ||
        this.getUserNameById(assigned.id ?? assigned.pk) ||
        'Unknown User'
      );
    }

    const user = this.users.find(
      item => String(item.id) === String(assigned)
    );

    if (user) {
      return this.getUserDisplayName(user);
    }

    if (
      typeof assigned === 'string' &&
      !/^\d+$/.test(assigned)
    ) {
      return assigned;
    }

    return this.getUserNameById(assigned) || 'Unknown User';
  }

  private getUserNameById(id: any): string {
    if (id === null || id === undefined || id === '') {
      return '';
    }

    const user = this.users.find(
      item => Number(item.id) === Number(id)
    );

    return user ? this.getUserDisplayName(user) : '';
  }

  private getUserDisplayName(user: User): string {
    const fullName = [
      user.first_name,
      user.last_name
    ].filter(Boolean).join(' ').trim();

    return fullName || user.username || user.email || 'Unknown User';
  }

  isTicketAssigned(): boolean {
    return this.getAssignedUserId() !== null;
  }

  // Load ticket details.
  loadTicket(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.ticketService.getTicket(id).subscribe({
      next: (response: any) => {
        this.ticket = response;

        this.editStatus = this.ticket.status || '';
        this.editPriority = this.ticket.priority || '';
        this.statusToSave = this.ticket.status || '';
        this.priorityToSave = this.ticket.priority || 'Low';

        this.setCurrentAssignee();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('TICKET DETAILS API ERROR:', error);

        this.ticket = null;
        this.loading = false;

        if (error.status === 401) {
          this.errorMessage =
            'Authentication is required to view this ticket.';
        } else if (error.status === 403) {
          this.errorMessage =
            'You are not allowed to view this ticket.';
        } else if (error.status === 404) {
          this.errorMessage = `Ticket ${id} was not found.`;
        } else if (error.status === 500) {
          this.errorMessage =
            'Server error while loading ticket details.';
        } else if (error.status === 0) {
          this.errorMessage =
            'Unable to connect to the backend server.';
        } else {
          this.errorMessage = this.getSharedErrorMessage(
            error,
            `Unable to load ticket details. Server returned ${error?.status ?? 'an unknown error'}.`
          );
        }

        this.cdr.detectChanges();
      }
    });
  }

  // Assign or reassign ticket.
  assignTicket(): void {
    if (!this.ticket || this.ticketId === null || this.assigning) {
      return;
    }

    if (this.selectedAssigneeId !== null) {
      const selectedUser = this.users.find(
        user => Number(user.id) === Number(this.selectedAssigneeId)
      );

      if (
        !selectedUser ||
        selectedUser.is_active === false ||
        String(selectedUser.role || '').trim().toLowerCase() !== 'team member'
      ) {
        this.assignmentError = true;
        this.assignmentMessage =
          'Select an active Team Member from your organization.';
        return;
      }
    }

    this.assigning = true;
    this.assignmentMessage = '';
    this.assignmentError = false;
    this.errorMessage = '';

    this.ticketService.updateTicket(this.ticketId, {
      assigned_to: this.selectedAssigneeId
    }).subscribe({
      next: () => {
        this.assigning = false;
        this.assignmentError = false;

        this.assignmentMessage =
          this.selectedAssigneeId === null
            ? 'Ticket is now unassigned.'
            : 'Ticket assignment updated successfully.';

        this.loadTicket(this.ticketId!);
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('TICKET ASSIGNMENT ERROR:', error);

        this.assigning = false;
        this.assignmentError = true;

        if (error.status === 400) {
          this.assignmentMessage =
            error?.error?.assigned_to?.[0] ||
            error?.error?.detail ||
            'Invalid assignee. Check the selected user and API field.';
        } else if (error.status === 401) {
          this.assignmentMessage =
            'Your session has expired. Please log in again.';
        } else if (error.status === 403) {
          this.assignmentMessage =
            'You do not have permission to assign this ticket.';
        } else if (error.status === 404) {
          this.assignmentMessage =
            'Ticket or selected user was not found.';
        } else {
          this.assignmentMessage =
            this.apiErrorService.getErrorMessage(error) ||
            'Unable to update ticket assignment.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  // Change ticket status.
  changeTicketStatus(): void {
    if (!this.ticket || this.ticketId === null || this.statusSaving) {
      return;
    }

    if (!this.statusToSave) {
      this.statusError = true;
      this.statusMessage = 'Please select a status.';
      return;
    }

    if (this.statusToSave === this.ticket.status) {
      this.statusError = false;
      this.statusMessage = 'Ticket already has this status.';
      return;
    }

    this.statusSaving = true;
    this.statusMessage = '';
    this.statusError = false;

    this.ticketService.updateTicket(this.ticketId, {
      status: this.statusToSave
    }).subscribe({
      next: (response: any) => {
        this.statusSaving = false;
        this.statusError = false;
        this.statusMessage = 'Ticket status updated successfully.';

        this.ticket = {
          ...this.ticket,
          ...(response && typeof response === 'object' ? response : {}),
          status: response?.status || this.statusToSave
        };

        this.editStatus = this.ticket.status;
        this.statusToSave = this.ticket.status;

        this.cdr.detectChanges();
        this.loadTicket(this.ticketId!);
      },
      error: (error: any) => {
        console.error('TICKET STATUS UPDATE ERROR:', error);

        this.statusSaving = false;
        this.statusError = true;

        if (error.status === 400) {
          this.statusMessage =
            error?.error?.status?.[0] ||
            error?.error?.detail ||
            'Invalid ticket status. Please select a supported status.';
        } else if (error.status === 401) {
          this.statusMessage =
            'Authentication is required to change ticket status.';
        } else if (error.status === 403) {
          this.statusMessage =
            'You do not have permission to change this ticket status.';
        } else if (error.status === 404) {
          this.statusMessage = 'Ticket was not found.';
        } else if (error.status === 0) {
          this.statusMessage = 'Unable to connect to the backend server.';
        } else {
          this.statusMessage = this.getSharedErrorMessage(
            error,
            `Unable to update ticket status. Server returned ${error?.status ?? 'an unknown error'}.`
          );
        }

        this.cdr.detectChanges();
      }
    });
  }

  // Change priority from the Details panel (Admin only).
  changeTicketPriority(): void {
    if (
      !this.isAdmin ||
      !this.ticket ||
      this.ticketId === null ||
      this.prioritySaving
    ) {
      return;
    }

    if (!this.priorityToSave) {
      this.priorityError = true;
      this.priorityMessage = 'Please select a priority.';
      return;
    }

    if (this.priorityToSave === this.ticket.priority) {
      this.priorityError = false;
      this.priorityMessage = 'Ticket already has this priority.';
      return;
    }

    this.prioritySaving = true;
    this.priorityMessage = '';
    this.priorityError = false;

    this.ticketService.updateTicket(this.ticketId, {
      priority: this.priorityToSave
    }).subscribe({
      next: (response: any) => {
        this.prioritySaving = false;
        this.priorityError = false;

        this.ticket = {
          ...this.ticket,
          ...(response && typeof response === 'object' ? response : {}),
          priority: response?.priority || this.priorityToSave
        };

        this.editPriority = this.ticket.priority;
        this.priorityToSave = this.ticket.priority;
        this.priorityMessage = 'Ticket priority updated successfully.';

        this.cdr.detectChanges();
        this.loadTicket(this.ticketId!);
      },
      error: (error: any) => {
        console.error('TICKET PRIORITY UPDATE ERROR:', error);

        this.prioritySaving = false;
        this.priorityError = true;

        if (error.status === 400) {
          this.priorityMessage =
            error?.error?.priority?.[0] ||
            error?.error?.detail ||
            'Invalid priority. Please select a supported value.';
        } else if (error.status === 401) {
          this.priorityMessage =
            'Authentication is required to change ticket priority.';
        } else if (error.status === 403) {
          this.priorityMessage =
            'You do not have permission to change ticket priority.';
        } else if (error.status === 404) {
          this.priorityMessage = 'Ticket was not found.';
        } else if (error.status === 0) {
          this.priorityMessage =
            'Unable to connect to the backend server.';
        } else {
          this.priorityMessage = this.getSharedErrorMessage(
            error,
            `Unable to update ticket priority. Server returned ${error?.status ?? 'an unknown error'}.`
          );
        }

        this.cdr.detectChanges();
      }
    });
  }

  startEditing(): void {
    if (!this.ticket) {
      return;
    }

    this.editStatus = this.ticket.status || '';
    this.editPriority = this.ticket.priority || '';
    this.errorMessage = '';
    this.successMessage = '';
    this.isEditing = true;

    this.cdr.detectChanges();
  }

  cancelEditing(): void {
    if (this.ticket) {
      this.editStatus = this.ticket.status || '';
      this.editPriority = this.ticket.priority || '';
    }

    this.isEditing = false;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  // Existing Edit Ticket save operation.
  saveChanges(): void {
    if (!this.ticket || this.ticketId === null || this.saving) {
      return;
    }

    if (!this.editStatus) {
      this.errorMessage = 'Please select a status.';
      return;
    }

    if (!this.editPriority) {
      this.errorMessage = 'Please select a priority.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.ticketService.updateTicket(this.ticketId, {
      status: this.editStatus,
      priority: this.editPriority
    }).subscribe({
      next: () => {
        this.saving = false;
        this.isEditing = false;
        this.successMessage = 'Ticket updated successfully.';

        this.loadTicket(this.ticketId!);
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('TICKET UPDATE ERROR:', error);

        this.saving = false;

        if (error.status === 400) {
          this.errorMessage =
            'Invalid ticket data. Please check the selected values.';
        } else if (error.status === 401) {
          this.errorMessage =
            'Authentication is required to update this ticket.';
        } else if (error.status === 403) {
          this.errorMessage =
            'You do not have permission to update this ticket.';
        } else if (error.status === 404) {
          this.errorMessage = 'Ticket was not found.';
        } else if (error.status === 500) {
          this.errorMessage = 'Server error while updating ticket.';
        } else if (error.status === 0) {
          this.errorMessage = 'Unable to connect to the backend server.';
        } else {
          this.errorMessage = this.getSharedErrorMessage(
            error,
            `Unable to update ticket. Server returned ${error?.status ?? 'an unknown error'}.`
          );
        }

        this.cdr.detectChanges();
      }
    });
  }

  private getSharedErrorMessage(
    error: any,
    fallback: string
  ): string {
    const message = this.apiErrorService.getErrorMessage(error);

    return message && message !== 'An unexpected error occurred.'
      ? message
      : fallback;
  }

  formatStatus(status: string): string {
    return status ? status.replace(/_/g, ' ') : '';
  }

  goBack(): void {
    this.router.navigate(['/tickets']);
  }
}
