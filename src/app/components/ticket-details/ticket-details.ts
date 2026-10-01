import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-details.html',
  styleUrl: './ticket-details.css'
})
export class TicketDetails implements OnInit {

  ticket: any = null;

  ticketId: number | null = null;

  loading = true;

  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    console.log('TicketDetails component loaded');

    const id = this.route.snapshot.paramMap.get('id');

    console.log('Ticket ID from URL:', id);

    if (!id) {
      this.loading = false;
      this.errorMessage = 'Ticket ID was not found.';

      this.cdr.detectChanges();

      return;
    }

    const parsedId = Number(id);

    if (isNaN(parsedId)) {
      this.loading = false;
      this.errorMessage = 'Invalid ticket ID.';

      this.cdr.detectChanges();

      return;
    }

    this.ticketId = parsedId;

    this.loadTicket(parsedId);
  }

  loadTicket(id: number): void {

    console.log('Calling API for ticket:', id);

    this.loading = true;
    this.errorMessage = '';

    this.ticketService.getTicket(id).subscribe({

      next: (response: any) => {

        console.log('FULL TICKET RESPONSE:', response);

        this.ticket = response;

        this.loading = false;

        console.log('Ticket assigned:', this.ticket);
        console.log('Loading:', this.loading);

        // Force Angular to update the page
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

  formatStatus(status: string): string {

    if (!status) {
      return '';
    }

    return status.replace(/_/g, ' ');
  }

  goBack(): void {

    this.router.navigate(['/tickets']);
  }
}