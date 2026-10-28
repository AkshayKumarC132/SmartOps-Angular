import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { ApiErrorService } from '../../services/api-error.service';
import { OrganizationContextService } from '../../services/organization-context.service';
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

interface DashboardOverviewResponse {
  tickets?: Ticket[] | { results?: Ticket[] };
  teams?: any[] | { results?: any[] };
  kb_articles?: any[] | { results?: any[] };
  users?: any[] | { results?: any[] };
  activities?: TicketActivity[] | { results?: TicketActivity[] };
  api_monitoring?: any;
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

  // API monitoring properties are retained for template compatibility.
  apiMonitoring: any = null;
  apiMonitoringLoading = true;
  apiMonitoringError = '';

  dashboardLastUpdated: Date | null = null;

  private readonly destroy$ = new Subject<void>();
  private requestInProgress = false;

  private readonly overviewUrl =
    `${environment.apiUrl}/dashboard/overview/`;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private apiErrorService: ApiErrorService,
    private organizationContextService: OrganizationContextService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();

    // The aggregated endpoint is called when the Dashboard component opens.
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all Dashboard data through one HTTP request.
   * No separate tickets, teams, users, KB, activity, or monitoring
   * requests are made by this component.
   */
  loadDashboardData(): void {
    if (this.requestInProgress) {
      return;
    }

    this.requestInProgress = true;
    this.loading = true;
    this.errorMessage = '';

    this.ticketsLoading = true;
    this.teamsLoading = true;
    this.kbArticlesLoading = true;
    this.usersLoading = true;
    this.activitiesLoading = true;
    this.apiMonitoringLoading = true;

    this.ticketsError = '';
    this.teamsError = '';
    this.kbArticlesError = '';
    this.usersError = '';
    this.activitiesError = '';
    this.apiMonitoringError = '';

    this.http
      .get<DashboardOverviewResponse>(this.overviewUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: DashboardOverviewResponse) => {
          const tickets = this.toArray<Ticket>(response?.tickets);
          const teams = this.toArray<any>(response?.teams);
          const articles = this.toArray<any>(response?.kb_articles);
          const users = this.toArray<any>(response?.users);
          const activities = this.toArray<TicketActivity>(
            response?.activities
          );

          this.tickets = tickets;
          this.teams = teams;
          this.kbArticles = articles;

          this.totalUsers =
            this.filterDashboardUsers(users).length;

          this.auditActivities = this.getRecentActivities(activities);

          this.apiMonitoring = response?.api_monitoring ?? null;

          this.ticketsLoading = false;
          this.teamsLoading = false;
          this.kbArticlesLoading = false;
          this.usersLoading = false;
          this.activitiesLoading = false;
          this.apiMonitoringLoading = false;

          this.dashboardLastUpdated = new Date();
          this.loading = false;
          this.requestInProgress = false;

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          const message = this.getSharedErrorMessage(
            error,
            'Unable to load dashboard data. Please try again.'
          );

          this.errorMessage = message;

          this.ticketsError = message;
          this.teamsError = message;
          this.kbArticlesError = message;
          this.usersError = message;
          this.activitiesError = message;
          this.apiMonitoringError = message;

          this.ticketsLoading = false;
          this.teamsLoading = false;
          this.kbArticlesLoading = false;
          this.usersLoading = false;
          this.activitiesLoading = false;
          this.apiMonitoringLoading = false;

          this.loading = false;
          this.requestInProgress = false;

          // Keep previously displayed data if a refresh fails.
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Handles both regular arrays and Django REST Framework paginated results.
   */
  private toArray<T>(
    value: T[] | { results?: T[] } | null | undefined
  ): T[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (value && Array.isArray(value.results)) {
      return value.results;
    }

    return [];
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  /**
   * Existing retry methods are retained for HTML template compatibility.
   * Each retry uses the same aggregated endpoint.
   */
  loadTickets(): void {
    this.loadDashboardData();
  }

  loadTeams(): void {
    this.loadDashboardData();
  }

  loadKbArticles(): void {
    this.loadDashboardData();
  }

  loadUsers(): void {
    this.loadDashboardData();
  }

  loadAuditActivities(): void {
    this.loadDashboardData();
  }

  loadApiMonitoring(): void {
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
      ticket =>
        this.normalizeStatus(ticket.status) === 'resolved'
    ).length;
  }

  get CriticalTickets(): number {
    return this.tickets.filter(
      ticket =>
        String(ticket.priority ?? '').trim().toLowerCase() === 'critical'
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

  private getRecentActivities(
    activities: TicketActivity[]
  ): TicketActivity[] {
    return [...activities]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || '').getTime();
        const dateB = new Date(b.created_at || '').getTime();

        return (
          (Number.isFinite(dateB) ? dateB : 0) -
          (Number.isFinite(dateA) ? dateA : 0)
        );
      })
      .slice(0, 5);
  }

  /**
   * Applies organization filtering before counting users.
   * Displays active non-admin users and the currently logged-in admin,
   * if that admin is included in the response.
   */
  private filterDashboardUsers(users: any[]): any[] {
    const organizationFilteredUsers =
      this.organizationContextService.filterRecords(users);

    const activeUsers = organizationFilteredUsers.filter(
      item =>
        item?.is_active === true ||
        item?.Is_Active === true
    );

    const nonAdminUsers = activeUsers.filter(
      item =>
        String(item?.role ?? item?.Role ?? '')
          .trim()
          .toLowerCase() !== 'admin'
    );

    const adminUsers = activeUsers.filter(
      item =>
        String(item?.role ?? item?.Role ?? '')
          .trim()
          .toLowerCase() === 'admin'
    );

    const currentUser = this.authService.getUser() || this.user;

    const currentId =
      currentUser?.id ??
      currentUser?.ID ??
      currentUser?.Id ??
      currentUser?.user_id ??
      currentUser?.userId ??
      currentUser?.['User Id'] ??
      null;

    const currentUsername = String(
      currentUser?.username ??
      currentUser?.Username ??
      currentUser?.user_name ??
      currentUser?.userName ??
      ''
    ).trim().toLowerCase();

    const currentEmail = String(
      currentUser?.email ??
      currentUser?.Email ??
      currentUser?.email_address ??
      ''
    ).trim().toLowerCase();

    const matchingAdmin = adminUsers.find(admin => {
      const adminId =
        admin?.id ??
        admin?.ID ??
        admin?.Id ??
        admin?.user_id ??
        admin?.userId ??
        admin?.['User Id'] ??
        null;

      const adminUsername = String(
        admin?.username ?? admin?.Username ?? ''
      ).trim().toLowerCase();

      const adminEmail = String(
        admin?.email ?? admin?.Email ?? ''
      ).trim().toLowerCase();

      const idMatches =
        currentId !== null &&
        currentId !== undefined &&
        adminId !== null &&
        adminId !== undefined &&
        String(currentId) === String(adminId);

      return (
        idMatches ||
        (!!currentUsername && adminUsername === currentUsername) ||
        (!!currentEmail && adminEmail === currentEmail)
      );
    });

    return matchingAdmin
      ? [matchingAdmin, ...nonAdminUsers]
      : nonAdminUsers;
  }

  private getSharedErrorMessage(
    error: any,
    fallback: string
  ): string {
    if (error?.status === 401) {
      return 'Your session has expired. Please log in again.';
    }

    if (error?.status === 403) {
      return 'You do not have permission to view this dashboard data.';
    }

    if (error?.status === 0) {
      return 'Unable to connect to the server. Check your connection.';
    }

    const message = this.apiErrorService.getErrorMessage(error);

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