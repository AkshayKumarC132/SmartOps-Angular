import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TicketService } from '../../services/ticket.service';
import { ApiErrorService } from '../../services/api-error.service';
import { UserService, User } from '../../services/user.service';
import { Ticket } from '../../models/tickets.model';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './ticket.html',
  styleUrl: './ticket.css'
})
export class Tickets implements OnInit {

  tickets: Ticket[] = [];
  users: User[] = [];

  loading = true;
  errorMessage = '';

  searchText = '';
  selectedStatus = 'All';
  selectedPriority = 'All';

  constructor(
    private ticketService: TicketService,
    private userService: UserService,
    private apiErrorService: ApiErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadTickets();
  }

  // ============================================
  // LOAD USERS
  // ============================================

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (response: any) => {
        const users = Array.isArray(response)
          ? response
          : response?.results ?? [];

        this.users = users;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Failed to load users:', error);
      }
    });
  }

  // ============================================
  // LOAD TICKETS
  // ============================================

  loadTickets(): void {
    this.loading = true;
    this.errorMessage = '';

    this.ticketService.getTickets().subscribe({
      next: (response: any) => {
        console.log('Admin Tickets Response:', response);

        const tickets: Ticket[] = Array.isArray(response)
          ? response
          : response?.results ?? [];

        // Keep the actual API values. Do not generate SLA dates.
        this.tickets = tickets;

        this.loading = false;
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('Admin Tickets Error:', error);

        this.loading = false;

        if (error?.status === 401) {
          this.errorMessage =
            'Authentication failed. Please login again.';
        } else if (error?.status === 403) {
          this.errorMessage =
            'You do not have permission to view tickets.';
        } else {
          this.errorMessage =
            this.apiErrorService.getErrorMessage(error);
        }

        this.cdr.detectChanges();
      }
    });
  }

  // ============================================
  // FILTER TICKETS
  // ============================================

  get filteredTickets(): Ticket[] {
    let result = [...this.tickets];

    const search = this.searchText.trim().toLowerCase();

    if (search) {
      result = result.filter(ticket => {
        const ticketId =
          ticket.ticket_id?.toLowerCase() || '';

        const ticketName =
          ticket.ticket_name?.toLowerCase() || '';

        const category =
          String(ticket.category ?? '').toLowerCase();

        const status =
          ticket.status?.toLowerCase() || '';

        const priority =
          ticket.priority?.toLowerCase() || '';

        const team =
          this.getDisplayValue(ticket.team).toLowerCase();

        const assignedTo =
          this.getAssignedToDisplay(ticket).toLowerCase();

        const slaDueDate =
          this.getSlaDueDate(ticket)?.toLowerCase() || '';

        return (
          ticketId.includes(search) ||
          ticketName.includes(search) ||
          category.includes(search) ||
          status.includes(search) ||
          priority.includes(search) ||
          team.includes(search) ||
          assignedTo.includes(search) ||
          slaDueDate.includes(search)
        );
      });
    }

    if (this.selectedStatus !== 'All') {
      result = result.filter(
        ticket => ticket.status === this.selectedStatus
      );
    }

    if (this.selectedPriority !== 'All') {
      result = result.filter(
        ticket =>
          ticket.priority?.toLowerCase() ===
          this.selectedPriority.toLowerCase()
      );
    }

    return result;
  }

  // ============================================
  // GET ACTUAL SLA DEADLINE
  // ============================================

  getSlaDueDate(ticket: Ticket): string | null {
    const dueDate = ticket?.sla_due_date;

    if (
      dueDate === null ||
      dueDate === undefined ||
      dueDate === ''
    ) {
      return null;
    }

    // Only display a valid date returned by the API.
    const parsedDate = new Date(dueDate);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return dueDate;
  }

  // ============================================
  // CHECK WHETHER SLA IS OVERDUE
  // ============================================

  isSlaOverdue(ticket: Ticket): boolean {
    const dueDate = this.getSlaDueDate(ticket);

    if (!dueDate) {
      return false;
    }

    const status = ticket.status?.toLowerCase();

    // Resolved and closed tickets are not marked overdue.
    if (status === 'resolved' || status === 'closed') {
      return false;
    }

    return new Date(dueDate).getTime() < Date.now();
  }

  // ============================================
  // SLA DISPLAY LABEL
  // ============================================

  getSlaLabel(ticket: Ticket): string {
    const dueDate = this.getSlaDueDate(ticket);

    if (!dueDate) {
      return 'Not set';
    }

    return this.isSlaOverdue(ticket)
      ? 'Overdue'
      : 'Within SLA';
  }

  // ============================================
  // DISPLAY ASSIGNED USER NAME
  // ============================================

  getAssignedToDisplay(ticket: any): string {
    const assigned =
      ticket?.assigned_to ??
      ticket?.assigned_to_id ??
      ticket?.assigned_to_username ??
      ticket?.assigned_to_name ??
      null;

    if (
      assigned === null ||
      assigned === undefined ||
      assigned === ''
    ) {
      return 'Not assigned';
    }

    // API returned a user object.
    if (typeof assigned === 'object') {
      const fullName = [
        assigned.first_name,
        assigned.last_name
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      return (
        fullName ||
        assigned.username ||
        assigned.name ||
        assigned.email ||
        'Unknown User'
      );
    }

    // API returned a username, name, or string ID.
    if (typeof assigned === 'string') {
      const matchedUser = this.users.find(
        user => String(user.id) === assigned
      );

      if (matchedUser) {
        return this.getUserDisplayName(matchedUser);
      }

      if (!/^\d+$/.test(assigned)) {
        return assigned;
      }
    }

    // API returned a numeric user ID.
    const user = this.users.find(
      item => Number(item.id) === Number(assigned)
    );

    return user
      ? this.getUserDisplayName(user)
      : 'Unknown User';
  }

  // ============================================
  // FORMAT USER NAME
  // ============================================

  private getUserDisplayName(user: User): string {
    const fullName = [
      user.first_name,
      user.last_name
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return (
      fullName ||
      user.username ||
      user.email ||
      'Unknown User'
    );
  }

  // ============================================
  // DISPLAY TEAM / OTHER VALUES
  // ============================================

  getDisplayValue(value: any): string {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 'Not assigned';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return (
      value.team_name ||
      value.name ||
      value.username ||
      value.Username ||
      'Not assigned'
    );
  }

  // ============================================
  // FORMAT STATUS
  // ============================================

  formatStatus(status: string): string {
    if (!status) {
      return '';
    }

    return status.replace(/_/g, ' ');
  }

  // ============================================
  // CLEAR FILTERS
  // ============================================

  clearFilters(): void {
    this.searchText = '';
    this.selectedStatus = 'All';
    this.selectedPriority = 'All';
  }

  // ============================================
  // OPEN TICKET
  // ============================================

  openTicket(id: number): void {
    this.router.navigate([
      '/ticket',
      id
    ]);
  }
}