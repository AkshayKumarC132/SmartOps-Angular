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

  loading = true;

  saving = false;

  errorMessage = '';

  successMessage = '';

  // ==============================
  // EDIT STATE
  // ==============================

  isEditing = false;

  editStatus = '';

  editPriority = '';

  // ==============================
  // AVAILABLE VALUES
  // ==============================

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
    'Urgent'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private cdr: ChangeDetectorRef
  ) {}

  // ==============================
  // INITIALIZE
  // ==============================

  ngOnInit(): void {

    console.log('TicketDetails component loaded');

    const id = this.route.snapshot.paramMap.get('id');

    console.log('Ticket ID from URL:', id);

    if (!id) {

      this.loading = false;

      this.errorMessage =
        'Ticket ID was not found.';

      this.cdr.detectChanges();

      return;
    }

    const parsedId = Number(id);

    if (isNaN(parsedId)) {

      this.loading = false;

      this.errorMessage =
        'Invalid ticket ID.';

      this.cdr.detectChanges();

      return;
    }

    this.ticketId = parsedId;

    this.loadTicket(parsedId);
  }

  // ==============================
  // LOAD TICKET
  // ==============================

  loadTicket(id: number): void {

    console.log(
      'Calling API for ticket:',
      id
    );

    this.loading = true;

    this.errorMessage = '';

    this.successMessage = '';

    this.ticketService
      .getTicket(id)
      .subscribe({

        next: (response: any) => {

          console.log(
            'FULL TICKET RESPONSE:',
            response
          );

          this.ticket = response;

          // Keep edit values synchronized
          this.editStatus =
            this.ticket.status || '';

          this.editPriority =
            this.ticket.priority || '';

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: (error: any) => {

          console.error(
            'TICKET DETAILS API ERROR:',
            error
          );

          this.ticket = null;

          this.loading = false;

          if (error.status === 401) {

            this.errorMessage =
              'Authentication is required to view this ticket.';

          } else if (error.status === 403) {

            this.errorMessage =
              'You are not allowed to view this ticket.';

          } else if (error.status === 404) {

            this.errorMessage =
              `Ticket ${id} was not found.`;

          } else if (error.status === 0) {

            this.errorMessage =
              'Unable to connect to the backend server.';

          } else {

            this.errorMessage =
              `Unable to load ticket details. Server returned ${error.status}.`;
          }

          this.cdr.detectChanges();
        }
      });
  }

  // ==============================
  // START EDITING
  // ==============================

  startEditing(): void {

    if (!this.ticket) {
      return;
    }

    this.editStatus =
      this.ticket.status || '';

    this.editPriority =
      this.ticket.priority || '';

    this.errorMessage = '';

    this.successMessage = '';

    this.isEditing = true;

    this.cdr.detectChanges();
  }

  // ==============================
  // CANCEL EDITING
  // ==============================

  cancelEditing(): void {

    if (this.ticket) {

      this.editStatus =
        this.ticket.status || '';

      this.editPriority =
        this.ticket.priority || '';
    }

    this.isEditing = false;

    this.errorMessage = '';

    this.successMessage = '';

    this.cdr.detectChanges();
  }

  // ==============================
  // SAVE CHANGES
  // ==============================

  saveChanges(): void {

    if (!this.ticket || !this.ticketId) {
      return;
    }

    // Basic validation
    if (!this.editStatus) {

      this.errorMessage =
        'Please select a status.';

      return;
    }

    if (!this.editPriority) {

      this.errorMessage =
        'Please select a priority.';

      return;
    }

    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';

    // IMPORTANT:
    // Only status and priority are sent.
    const updateData = {
      status: this.editStatus,
      priority: this.editPriority
    };

    console.log(
      'Updating ticket:',
      updateData
    );

    this.ticketService
      .updateTicket(
        this.ticketId,
        updateData
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Ticket update response:',
            response
          );

          this.saving = false;

          this.isEditing = false;

          this.successMessage =
            'Ticket updated successfully.';

          /*
           * Reload from backend instead of manually
           * changing the ticket object.
           *
           * This ensures the UI displays the actual
           * saved values from Django.
           */
          this.loadTicket(
            this.ticketId!
          );

          this.cdr.detectChanges();
        },

        error: (error: any) => {

          console.error(
            'TICKET UPDATE ERROR:',
            error
          );

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

            this.errorMessage =
              'Ticket was not found.';

          } else if (error.status === 0) {

            this.errorMessage =
              'Unable to connect to the backend server.';

          } else {

            this.errorMessage =
              `Unable to update ticket. Server returned ${error.status}.`;
          }

          this.cdr.detectChanges();
        }
      });
  }

  // ==============================
  // FORMAT STATUS
  // ==============================

  formatStatus(status: string): string {

    if (!status) {
      return '';
    }

    return status.replace(/_/g, ' ');
  }

  // ==============================
  // BACK
  // ==============================

  goBack(): void {

    this.router.navigate([
      '/tickets'
    ]);
  }
}