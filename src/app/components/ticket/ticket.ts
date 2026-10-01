import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TicketService } from '../../services/ticket.service';
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

  loading = true;
  errorMessage = '';

  searchText = '';
  selectedStatus = 'All';
  selectedPriority = 'All';

  constructor(
    private ticketService: TicketService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {

    this.loading = true;
    this.errorMessage = '';

    this.ticketService
      .getTickets()
      .subscribe({

        next: (response) => {

          console.log(
            'Admin Tickets Response:',
            response
          );

          this.tickets = response;

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Admin Tickets Error:',
            error
          );

          this.loading = false;

          if (error.status === 401) {

            this.errorMessage =
              'Authentication failed. Please login again.';

          } else if (error.status === 403) {

            this.errorMessage =
              'You do not have permission to view tickets.';

          } else {

            this.errorMessage =
              'Unable to load tickets.';
          }

          this.cdr.detectChanges();
        }

      });
  }

  get filteredTickets(): Ticket[] {

    let result = [...this.tickets];

    const search =
      this.searchText
        .trim()
        .toLowerCase();

    if (search) {

      result = result.filter(ticket => {

        const ticketId =
          ticket.ticket_id
            ?.toLowerCase() || '';

        const ticketName =
          ticket.ticket_name
            ?.toLowerCase() || '';

        const category =
          ticket.category
            ?.toLowerCase() || '';

        const status =
          ticket.status
            ?.toLowerCase() || '';

        const priority =
          ticket.priority
            ?.toLowerCase() || '';

        const team =
          this.getDisplayValue(
            ticket.team
          ).toLowerCase();

        const assignedTo =
          this.getDisplayValue(
            ticket.assigned_to
          ).toLowerCase();

        return (
          ticketId.includes(search) ||
          ticketName.includes(search) ||
          category.includes(search) ||
          status.includes(search) ||
          priority.includes(search) ||
          team.includes(search) ||
          assignedTo.includes(search)
        );
      });
    }

    if (this.selectedStatus !== 'All') {

      result = result.filter(
        ticket =>
          ticket.status ===
          this.selectedStatus
      );
    }

    if (this.selectedPriority !== 'All') {

      result = result.filter(
        ticket =>
          ticket.priority
            ?.toLowerCase() ===
          this.selectedPriority
            .toLowerCase()
      );
    }

    return result;
  }

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
      value.username ||
      value.Username ||
      value.team_name ||
      value.name ||
      'Not assigned'
    );
  }

  formatStatus(status: string): string {

    if (!status) {
      return '';
    }

    return status.replace(
      /_/g,
      ' '
    );
  }

  clearFilters(): void {

    this.searchText = '';
    this.selectedStatus = 'All';
    this.selectedPriority = 'All';
  }

  openTicket(id: number): void {

    this.router.navigate([
      '/ticket',
      id
    ]);
  }
}