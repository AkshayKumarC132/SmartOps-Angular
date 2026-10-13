
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  NavigationEnd,
  Router
} from '@angular/router';

import { HttpClient } from '@angular/common/http';

import { Subject, interval } from 'rxjs';

import {
  filter,
  takeUntil
} from 'rxjs/operators';

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

// ============================================
// DASHBOARD COMPONENT
// ============================================

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {

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
  totalUsers = 0;

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
  // DESTROY SUBJECT
  // ============================================

  private destroy$ = new Subject<void>();

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
    console.log('Dashboard component initialized');

    this.user = this.authService.getUser();

    // Load all dashboard data immediately.
    this.loadDashboardData();

    // Automatically refresh the user count every 30 seconds.
    // The initial count is already loaded above.
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('Refreshing dashboard user count...');
        this.loadUsers();
      });

    // Refresh dashboard data when navigating back to Dashboard.
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        if (event.urlAfterRedirects === '/dashboard') {
          console.log('Dashboard opened - refreshing dashboard data');
          this.loadDashboardData();
        }
      });
  }

  // ============================================
  // DESTROY COMPONENT
  // ============================================

  ngOnDestroy(): void {
    console.log('Dashboard component destroyed');

    // Stops the automatic refresh and other subscriptions
    // that use destroy$.
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // LOAD COMPLETE DASHBOARD
  // ============================================

  loadDashboardData(): void {
    console.log('Loading dashboard data...');

    this.loadTickets();
    this.loadTeams();
    this.loadKbArticles();
    this.loadUsers();
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
      ticket => ticket.status === 'Open'
    ).length;
  }

  // ============================================
  // IN PROGRESS TICKETS
  // ============================================

  get inProgressTickets(): number {
    return this.tickets.filter(
      ticket => ticket.status === 'In_Progress'
    ).length;
  }

  // ============================================
  // RESOLVED TICKETS
  // ============================================

  get resolvedTickets(): number {
    return this.tickets.filter(
      ticket => ticket.status === 'Resolved'
    ).length;
  }

  // ============================================
  // CRITICAL TICKETS
  // ============================================

  get CriticalTickets(): number {
    return this.tickets.filter(
      ticket =>
        String(ticket.priority || '').toLowerCase() === 'critical'
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
    return [...this.tickets]
      .sort((a: any, b: any) => {
        const dateA = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const dateB = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        return dateB - dateA;
      })
      .slice(0, 5);
  }

  // ============================================
  // LOAD TICKETS
  // ============================================

  loadTickets(): void {
    console.log('Loading tickets for dashboard...');

    this.loading = true;
    this.errorMessage = '';

    this.ticketService.getTickets().subscribe({
      next: (response: Ticket[]) => {
        console.log('Dashboard Tickets API Response:', response);

        this.tickets = Array.isArray(response) ? response : [];

        console.log('Dashboard ticket count:', this.tickets.length);

        console.log(
          'Dashboard ticket priorities:',
          this.tickets.map(ticket => ({
            id: ticket.id,
            ticket_id: (ticket as any).ticket_id,
            priority: ticket.priority
          }))
        );

        console.log('Critical ticket count:', this.CriticalTickets);

        this.loading = false;
        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('Tickets API Error:', error);

        this.loading = false;
        this.tickets = [];

        if (error.status === 401) {
          this.errorMessage =
            'Authentication failed. Please login again.';
        } else if (error.status === 403) {
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
    this.ticketService.getTeams().subscribe({
      next: (response: any[]) => {
        console.log('Dashboard Teams Response:', response);

        this.teams = Array.isArray(response) ? response : [];

        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('Dashboard Teams Error:', error);

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
      .get<any>(`${environment.apiUrl}/kb/articles/`)
      .subscribe({
        next: (response: any) => {
          console.log('Dashboard KB Articles Response:', response);

          if (Array.isArray(response)) {
            this.kbArticles = response;
          } else if (
            response &&
            Array.isArray(response.results)
          ) {
            this.kbArticles = response.results;
          } else {
            this.kbArticles = [];
          }

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error('Dashboard KB Articles Error:', error);

          this.kbArticles = [];
          this.cdr.detectChanges();
        }
      });
  }

  // ============================================
  // USER VISIBILITY
  // Matches User Management's existing filtering.
  // ============================================

  private filterDashboardUsers(users: any[]): any[] {
    // Exclude inactive users.
    const activeUsers = users.filter(
      user => user.is_active === true
    );

    // Keep non-admin users.
    const nonAdminUsers = activeUsers.filter(
      user =>
        String(user.role || '').trim().toLowerCase() !== 'admin'
    );

    // Find admin accounts.
    const adminUsers = activeUsers.filter(
      user =>
        String(user.role || '').trim().toLowerCase() === 'admin'
    );

    const currentUser = this.authService.getUser() || this.user;

    const currentId =
      currentUser?.id ??
      currentUser?.user_id ??
      currentUser?.userId ??
      null;

    const currentUsername = String(
      currentUser?.username ??
      currentUser?.user_name ??
      currentUser?.userName ??
      ''
    ).trim().toLowerCase();

    const currentEmail = String(
      currentUser?.email ??
      currentUser?.email_address ??
      ''
    ).trim().toLowerCase();

    // Prefer the currently logged-in admin.
    const matchingAdmin = adminUsers.find(admin => {
      const idMatches =
        currentId !== null &&
        admin.id !== null &&
        admin.id !== undefined &&
        String(currentId) === String(admin.id);

      const usernameMatches =
        !!currentUsername &&
        String(admin.username || '').trim().toLowerCase() ===
          currentUsername;

      const emailMatches =
        !!currentEmail &&
        String(admin.email || '').trim().toLowerCase() ===
          currentEmail;

      return idMatches || usernameMatches || emailMatches;
    });

    // Preserve the fallback from the existing User Management code.
    const fallbackAdmin = adminUsers.find(admin => {
      const username = String(admin.username || '')
        .trim()
        .toLowerCase();

      const email = String(admin.email || '')
        .trim()
        .toLowerCase();

      return username === 's' || email === 's@gmail.com';
    });

    const visibleAdmin = matchingAdmin || fallbackAdmin;

    return visibleAdmin
      ? [visibleAdmin, ...nonAdminUsers]
      : nonAdminUsers;
  }

  // ============================================
  // LOAD USERS
  // Called initially and every 30 seconds.
  // ============================================

  loadUsers(): void {
    this.http
      .get<any>(`${environment.apiUrl}/auth/users/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Dashboard Users API Response:', response);

          let users: any[] = [];

          if (Array.isArray(response)) {
            users = response;
          } else if (
            response &&
            Array.isArray(response.results)
          ) {
            users = response.results;
          }

          // Apply the same visibility rules as User Management.
          const visibleUsers = this.filterDashboardUsers(users);

          this.totalUsers = visibleUsers.length;

          console.log(
            'Dashboard visible user count:',
            this.totalUsers
          );

          console.log(
            'Dashboard visible users:',
            visibleUsers.map(user => ({
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              is_active: user.is_active
            }))
          );

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          console.error('Dashboard Users Error:', error);

          // Keep the last successful count if a periodic
          // refresh fails temporarily.
          this.cdr.detectChanges();
        }
      });
  }

  // ============================================
  // LOAD AUDIT LOG / RECENT ACTIVITY
  // ============================================

  loadAuditActivities(): void {
    this.ticketService.getAuditActivities().subscribe({
      next: (response: any[]) => {
        console.log(
          'Dashboard Audit Activity Response:',
          response
        );

        if (Array.isArray(response)) {
          this.auditActivities = [...response]
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

      error: (error: any) => {
        console.error('Dashboard Audit Activity Error:', error);

        this.auditActivities = [];
        this.cdr.detectChanges();
      }
    });
  }

  // ============================================
  // OPEN TICKET
  // ============================================

  openTicket(id: number): void {
    this.router.navigate(['/ticket', id]);
  }

  // ============================================
  // GO TO TICKETS
  // ============================================

  goToTickets(): void {
    this.router.navigate(['/tickets']);
  }
}
