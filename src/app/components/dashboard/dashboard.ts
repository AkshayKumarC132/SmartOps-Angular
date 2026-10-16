
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, interval } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { ApiErrorService } from '../../services/api-error.service';
import { Ticket } from '../../models/tickets.model';
import { environment } from '../../../environments/environment';

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
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  user: any = null;

  tickets: Ticket[] = [];
  teams: any[] = [];
  kbArticles: any[] = [];
  totalUsers = 0;
  auditActivities: TicketActivity[] = [];

  loading = true;
  errorMessage = '';

  ticketsLoading = true;
  teamsLoading = true;
  kbArticlesLoading = true;
  usersLoading = true;
  activitiesLoading = true;

  ticketsError = '';
  teamsError = '';
  kbArticlesError = '';
  usersError = '';
  activitiesError = '';

  dashboardLastUpdated: Date | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private apiErrorService: ApiErrorService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadDashboardData();

    // Preserve the existing automatic user-count refresh.
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadUsers());

    // Refresh dashboard data when returning to Dashboard.
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        if (event.urlAfterRedirects === '/dashboard') {
          this.loadDashboardData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.loadTickets();
    this.loadTeams();
    this.loadKbArticles();
    this.loadUsers();
    this.loadAuditActivities();
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  get username(): string {
    return (
      this.user?.Username ||
      this.user?.username ||
      'Admin'
    );
  }

  private normalizeStatus(status: unknown): string {
    return String(status ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }

  get openTickets(): number {
    return this.tickets.filter(
      ticket => this.normalizeStatus(ticket.status) === 'open'
    ).length;
  }

  get inProgressTickets(): number {
    return this.tickets.filter(
      ticket =>
        this.normalizeStatus(ticket.status) === 'in_progress'
    ).length;
  }

  get resolvedTickets(): number {
    return this.tickets.filter(
      ticket => this.normalizeStatus(ticket.status) === 'resolved'
    ).length;
  }

  get CriticalTickets(): number {
    return this.tickets.filter(
      ticket =>
        String(ticket.priority || '').trim().toLowerCase() === 'critical'
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
    const getTimestamp = (ticket: Ticket): number => {
      const record = ticket as Ticket & {
        created_at?: string | null;
        updated_at?: string | null;
      };

      const date = record.created_at || record.updated_at;

      if (!date) {
        return 0;
      }

      const timestamp = new Date(date).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    return [...this.tickets]
      .sort(
        (a, b) => getTimestamp(b) - getTimestamp(a)
      )
      .slice(0, 5);
  }

  loadTickets(): void {
    this.ticketsLoading = true;
    this.loading = true;
    this.ticketsError = '';
    this.errorMessage = '';

    this.ticketService.getTickets()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: Ticket[]) => {
          this.tickets = Array.isArray(response)
            ? response
            : [];

          this.ticketsLoading = false;
          this.loading = false;
          this.dashboardLastUpdated = new Date();
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.ticketsLoading = false;
          this.loading = false;
          this.tickets = [];

          if (error?.status === 401) {
            this.ticketsError =
              'Your session has expired. Please log in again.';
          } else if (error?.status === 403) {
            this.ticketsError =
              'You do not have permission to view tickets.';
          } else if (error?.status === 0) {
            this.ticketsError =
              'Unable to connect to the server. Check your connection.';
          } else {
            this.ticketsError = this.getSharedErrorMessage(
              error,
              'Unable to load tickets. Please try again.'
            );
          }

          this.errorMessage = this.ticketsError;
          this.cdr.detectChanges();
        }
      });
  }

  loadTeams(): void {
    this.teamsLoading = true;
    this.teamsError = '';

    this.ticketService.getTeams()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any[]) => {
          this.teams = Array.isArray(response)
            ? response
            : [];

          this.teamsLoading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.teamsLoading = false;
          this.teamsError = error?.status === 403
            ? 'You do not have permission to view teams.'
            : this.getSharedErrorMessage(
                error,
                'Unable to load teams. Please try again.'
              );

          this.teams = [];
          this.cdr.detectChanges();
        }
      });
  }

  loadKbArticles(): void {
    this.kbArticlesLoading = true;
    this.kbArticlesError = '';

    this.http
      .get<any>(`${environment.apiUrl}/kb/articles/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
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

          this.kbArticlesLoading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.kbArticlesLoading = false;
          this.kbArticlesError = error?.status === 403
            ? 'You do not have permission to view Knowledge Base articles.'
            : this.getSharedErrorMessage(
                error,
                'Unable to load Knowledge Base articles. Please try again.'
              );

          this.kbArticles = [];
          this.cdr.detectChanges();
        }
      });
  }

  // Preserve the existing dashboard user-visibility rules.
  private filterDashboardUsers(users: any[]): any[] {
    const activeUsers = users.filter(
      user => user.is_active === true
    );

    const nonAdminUsers = activeUsers.filter(
      user =>
        String(user.role || '').trim().toLowerCase() !== 'admin'
    );

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

    // Preserved from your existing implementation.
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

  loadUsers(): void {
    this.usersLoading = true;
    this.usersError = '';

    this.http
      .get<any>(`${environment.apiUrl}/auth/users/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let users: any[] = [];

          if (Array.isArray(response)) {
            users = response;
          } else if (
            response &&
            Array.isArray(response.results)
          ) {
            users = response.results;
          }

          const visibleUsers =
            this.filterDashboardUsers(users);

          this.totalUsers = visibleUsers.length;
          this.usersLoading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.usersLoading = false;
          this.usersError = error?.status === 403
            ? 'You do not have permission to view users.'
            : this.getSharedErrorMessage(
                error,
                'Unable to load users. Please try again.'
              );

          // Retain the last successful count on refresh failure.
          this.cdr.detectChanges();
        }
      });
  }

  loadAuditActivities(): void {
    this.activitiesLoading = true;
    this.activitiesError = '';

    this.ticketService.getAuditActivities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any[]) => {
          if (Array.isArray(response)) {
            this.auditActivities = [...response]
              .sort((a, b) => {
                const dateA =
                  new Date(a.created_at || '').getTime();
                const dateB =
                  new Date(b.created_at || '').getTime();

                return (
                  (Number.isFinite(dateB) ? dateB : 0) -
                  (Number.isFinite(dateA) ? dateA : 0)
                );
              })
              .slice(0, 5);
          } else {
            this.auditActivities = [];
          }

          this.activitiesLoading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.activitiesLoading = false;
          this.activitiesError = this.getSharedErrorMessage(
            error,
            'Unable to load recent activity. Please try again.'
          );

          this.auditActivities = [];
          this.cdr.detectChanges();
        }
      });
  }

  // ============================================
  // SHARED API ERROR HANDLING
  // ============================================

  private getSharedErrorMessage(
    error: any,
    fallback: string
  ): string {
    const message =
      this.apiErrorService.getErrorMessage(error);

    return message &&
      message !== 'An unexpected error occurred. Please try again.'
      ? message
      : fallback;
  }

  openTicket(id: number): void {
    this.router.navigate(['/ticket', id]);
  }

  goToTickets(): void {
    this.router.navigate(['/tickets']);
  }
}
