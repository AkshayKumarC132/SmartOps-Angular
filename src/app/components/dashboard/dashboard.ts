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


// ============================================
// TICKET ACTIVITY / AUDIT LOG INTERFACE
// ============================================

interface TicketActivity {
  id: number;
  ticket: string | null;
  performed_by: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string;
  result: string;
  created_at: string;
}


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

  // ============================================
  // USER
  // ============================================

  user: any = null;


  // ============================================
  // DASHBOARD DATA
  // ============================================

  tickets: Ticket[] = [];

  teams: any[] = [];

  kbArticles: any[] = [];

  totalUsers: number = 0;


  // ============================================
  // AUDIT LOG DATA
  // ============================================

  auditActivities: TicketActivity[] = [];


  // ============================================
  // DASHBOARD STATE
  // ============================================

  loading = true;

  errorMessage = '';


  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}


  // ============================================
  // INITIALIZE DASHBOARD
  // ============================================

  ngOnInit(): void {

    this.user =
      this.authService.getUser();

    this.loadTickets();

    this.loadTeams();

    this.loadKbArticles();

    this.loadUsers();

    // Load Audit Log / Recent Activity
    this.loadAuditActivities();
  }


  // ============================================
  // USERNAME
  // ============================================

  get username(): string {

    return (
      this.user?.Username ||
      this.user?.username ||
      'Admin'
    );
  }


  // ============================================
  // OPEN TICKETS
  // ============================================

  get openTickets(): number {

    return this.tickets.filter(
      ticket =>
        ticket.status === 'Open'
    ).length;
  }


  // ============================================
  // IN PROGRESS TICKETS
  // ============================================

  get inProgressTickets(): number {

    return this.tickets.filter(
      ticket =>
        ticket.status === 'In_Progress'
    ).length;
  }


  // ============================================
  // RESOLVED TICKETS
  // ============================================

  get resolvedTickets(): number {

    return this.tickets.filter(
      ticket =>
        ticket.status === 'Resolved'
    ).length;
  }


  // ============================================
  // URGENT TICKETS
  // ============================================

  get urgentTickets(): number {

    return this.tickets.filter(
      ticket =>
        ticket.priority?.toLowerCase() ===
        'urgent'
    ).length;
  }


  // ============================================
  // TOTAL TICKETS
  // ============================================

  get totalTickets(): number {

    return this.tickets.length;
  }


  // ============================================
  // TOTAL TEAMS
  // ============================================

  get totalTeams(): number {

    return this.teams.length;
  }


  // ============================================
  // TOTAL KB ARTICLES
  // ============================================

  get totalKbArticles(): number {

    return this.kbArticles.length;
  }


  // ============================================
  // RECENT TICKETS
  // ============================================

  get recentTickets(): Ticket[] {

    return this.tickets.slice(0, 5);
  }


  // ============================================
  // LOAD TICKETS
  // ============================================

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


  // ============================================
  // LOAD TEAMS
  // ============================================

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


  // ============================================
  // LOAD KNOWLEDGE BASE ARTICLES
  // ============================================

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


  // ============================================
  // LOAD USERS
  // ============================================

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
           *
           * [
           *   {...},
           *   {...}
           * ]
           *
           * 2. Paginated response
           *
           * {
           *   count: 10,
           *   results: [...]
           * }
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


  // ============================================
  // LOAD AUDIT LOG / RECENT ACTIVITY
  // ============================================

  loadAuditActivities(): void {

    this.ticketService
      .getAuditActivities()
      .subscribe({

        next: (response: any[]) => {

          console.log(
            'Dashboard Audit Activity Response:',
            response
          );


          // Make sure response is an array
          if (Array.isArray(response)) {

            /*
             * Sort newest activity first.
             *
             * Backend currently returns activities
             * ordered by created_at ascending,
             * so we reverse the order here.
             */

            this.auditActivities = response
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .slice(0, 5);

          } else {

            this.auditActivities = [];
          }


          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Dashboard Audit Activity Error:',
            error
          );

          this.auditActivities = [];

          this.cdr.detectChanges();
        }

      });
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


  // ============================================
  // GO TO TICKETS
  // ============================================

  goToTickets(): void {

    this.router.navigate([
      '/tickets'
    ]);
  }

}