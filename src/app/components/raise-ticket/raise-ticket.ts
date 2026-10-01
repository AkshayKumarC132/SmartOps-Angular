import {
  ChangeDetectorRef,
  Component
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-raise-ticket',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './raise-ticket.html',
  styleUrl: './raise-ticket.css'
})
export class RaiseTicket {

  ticketName = '';
  description = '';
  summary = '';
  category = 'Other';
  priority = 'Low';

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private ticketService: TicketService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  submitTicket(): void {

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.ticketName.trim()) {
      this.errorMessage = 'Ticket name is required.';
      return;
    }

    if (!this.summary.trim()) {
      this.errorMessage = 'Summary is required.';
      return;
    }

    const data = {
      ticket_name: this.ticketName,
      description: this.description,
      summary: this.summary,
      category: this.category,
      priority: this.priority
    };

    this.loading = true;

    this.ticketService.createTicket(data).subscribe({

      next: (response) => {

        console.log('Ticket created:', response);

        this.loading = false;
        this.successMessage = 'Ticket raised successfully.';

        this.cdr.detectChanges();

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      },

      error: (error) => {

        console.error('Create ticket error:', error);

        this.loading = false;

        if (error.error) {
          this.errorMessage =
            JSON.stringify(error.error);
        } else {
          this.errorMessage =
            'Unable to raise ticket.';
        }

        this.cdr.detectChanges();
      }

    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }
}