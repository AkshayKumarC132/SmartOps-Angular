import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { Ticket } from '../../models/tickets.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  user: any = null;

  tickets: Ticket[] = [];
  teams: any[] = [];
  kbArticles: any[] = [];

  // Total number of users
  totalUsers: number = 0;

  loading = true;
  errorMessage = '';

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit(): void {

    this.user =
      this.authService.getUser();

    this.loadTickets();
    this.loadTeams();
    this.loadKbArticles();
    this.loadUsers();
  }

  get username(): string {

    return (
      this.user?.Username ||
      this.user?.username ||
      'Admin'
    );
  }

  get openTickets(): number {

    return this.tickets.filter(
      ticket =>
        ticket.status === 'Open'
    ).length;
  }

  get inProgressTickets(): number {

    return this.tickets.filter(
      ticket =>
        ticket.status === 'In_Progress'
    ).length;
  }

  get resolvedTickets(): number {

    return this.tickets.filter(
      ticket =>
        ticket.status === 'Resolved'
    ).length;
  }

  get urgentTickets(): number {

    return this.tickets.filter(
      ticket =>
        ticket.priority?.toLowerCase() ===
        'urgent'
    ).length;
  }

  get totalTickets(): number {

    return this.tickets.length;
  }

  get totalTeams(): number {

    return this.teams.length;
  }

  get totalKbArticles(): number {

    return this.kbArticles.length;
  }

  get recentTickets(): Ticket[] {

    return this.tickets.slice(0, 5);
  }

  loadTickets(): void {

    this.loading = true;
    this.errorMessage = '';

    this.ticketService
      .getTickets()
      .subscribe({

        next: (response) => {

          console.log(
            'Tickets API Response:',
            response
          );

          this.tickets = response;

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Tickets API Error:',
            error
          );

          this.loading = false;

          if (error.status === 401) {

            this.errorMessage =
              'Authentication failed. Please login again.';

          } else if (
            error.status === 403
          ) {

            this.errorMessage =
              'You do not have permission to view tickets.';

          } else {

            this.errorMessage =
              'Unable to load tickets from the server.';
          }

          this.cdr.detectChanges();
        }

      });
  }

  loadTeams(): void {

    this.ticketService
      .getTeams()
      .subscribe({

        next: (response) => {

          console.log(
            'Dashboard Teams Response:',
            response
          );

          this.teams = response;

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Dashboard Teams Error:',
            error
          );

          this.teams = [];

          this.cdr.detectChanges();
        }

      });
  }

  loadKbArticles(): void {

    this.http
      .get<any>(
        `${environment.apiUrl}/kb/articles/`
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Dashboard KB Articles Response:',
            response
          );

          if (Array.isArray(response)) {

            this.kbArticles = response;

          } else if (
            response &&
            Array.isArray(response.results)
          ) {

            this.kbArticles =
              response.results;

          } else {

            this.kbArticles = [];
          }

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Dashboard KB Articles Error:',
            error
          );

          this.kbArticles = [];

          this.cdr.detectChanges();
        }

      });
  }

  loadUsers(): void {

    this.http
      .get<any>(
        `${environment.apiUrl}/auth/users/`
      )
      .subscribe({

        next: (response) => {

          console.log(
            'Dashboard Users Response:',
            response
          );

          /*
           * Django REST Framework can return either:
           *
           * 1. Direct array
           *    [
           *      {...},
           *      {...}
           *    ]
           *
           * 2. Paginated response
           *    {
           *      count: 10,
           *      results: [...]
           *    }
           */

          if (Array.isArray(response)) {

            this.totalUsers =
              response.length;

          } else if (
            response &&
            typeof response.count === 'number'
          ) {

            this.totalUsers =
              response.count;

          } else if (
            response &&
            Array.isArray(response.results)
          ) {

            this.totalUsers =
              response.results.length;

          } else {

            this.totalUsers = 0;
          }

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Dashboard Users Error:',
            error
          );

          this.totalUsers = 0;

          this.cdr.detectChanges();
        }

      });
  }

  openTicket(id: number): void {

    this.router.navigate([
      '/ticket',
      id
    ]);
  }

  goToTickets(): void {

    this.router.navigate([
      '/tickets'
    ]);
  }
}