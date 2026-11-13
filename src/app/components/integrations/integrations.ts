import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  forkJoin,
  of,
  catchError,
  finalize
} from 'rxjs';

import { IntegrationService } from '../../services/integration.service';

type IntegrationTab =
  | 'overview'
  | 'email'
  | 'webhook'
  | 'deliveries';

type DeliveryChannel = 'EMAIL' | 'WEBHOOK';

interface IntegrationEndpoint {
  id: number;
  name: string;
  email?: string;
  url?: string;
  events: string[];
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface DeliveryRow {
  id: number;
  channel: DeliveryChannel;
  endpoint_name?: string;
  email?: string;
  event_type: string;
  status: string;
  attempt_count: number;
  created_at: string;
  updated_at?: string;
  delivered_at?: string | null;
  error_message?: string;
  response_status?: number | null;
  response_body?: string;
  payload?: any;
  message?: string;
  subject?: string;
  attempts?: any[];
}

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './integrations.html',
  styleUrl: './integrations.css'
})
export class Integrations implements OnInit {

  // ================================
  // PAGE STATE
  // ================================

  activeTab: IntegrationTab = 'overview';

  loading = true;
  refreshing = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  private hasLoaded = false;
  private requestInProgress = false;

  // ================================
  // ENDPOINT DATA
  // ================================

  emailEndpoints: IntegrationEndpoint[] = [];
  webhookEndpoints: IntegrationEndpoint[] = [];

  emailEndpointError = '';
  webhookEndpointError = '';

  // ================================
  // DELIVERY DATA
  // ================================

  emailDeliveries: any[] = [];
  webhookDeliveries: any[] = [];

  emailDeliveryError = '';
  webhookDeliveryError = '';

  deliveryFilter = 'ALL';

  selectedDelivery: DeliveryRow | null = null;

  // ================================
  // CREATE FORM
  // ================================

  createFormType: 'email' | 'webhook' | null = null;

  emailForm = {
    name: '',
    email: ''
  };

  webhookForm = {
    name: '',
    url: ''
  };

  selectedEvents: string[] = [];

  readonly availableEvents: string[] = [
    'TICKET_CREATED',
    'TICKET_ASSIGNED',
    'STATUS_CHANGED',
    'TICKET_RESOLVED',
    'TICKET_CLOSED',
    'TICKET_REOPENED',
    'SLA_WARNING',
    'SLA_RESPONSE_BREACHED',
    'SLA_RESOLUTION_BREACHED'
  ];

  constructor(
    private integrationService: IntegrationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  // ================================
  // LOAD ALL INTEGRATION DATA
  // ================================

  loadData(): void {

  // Prevent duplicate requests.
  if (this.requestInProgress) {
    return;
  }

  this.requestInProgress = true;

  if (this.hasLoaded) {
    this.refreshing = true;
  } else {
    this.loading = true;
  }

  this.errorMessage = '';

  this.emailEndpointError = '';
  this.webhookEndpointError = '';
  this.emailDeliveryError = '';
  this.webhookDeliveryError = '';

  forkJoin({

    emailEndpoints:
      this.integrationService.getEmailEndpoints().pipe(
        catchError(error => {
          console.error('Email endpoints error:', error);
          this.emailEndpointError =
            this.getErrorMessage(error);
          return of([]);
        })
      ),

    webhookEndpoints:
      this.integrationService.getWebhookEndpoints().pipe(
        catchError(error => {
          console.error('Webhook endpoints error:', error);
          this.webhookEndpointError =
            this.getErrorMessage(error);
          return of([]);
        })
      ),

    emailDeliveries:
      this.integrationService.getEmailDeliveries().pipe(
        catchError(error => {
          console.error('Email deliveries error:', error);
          this.emailDeliveryError =
            this.getErrorMessage(error);
          return of([]);
        })
      ),

    webhookDeliveries:
      this.integrationService.getWebhookDeliveries().pipe(
        catchError(error => {
          console.error('Webhook deliveries error:', error);
          this.webhookDeliveryError =
            this.getErrorMessage(error);
          return of([]);
        })
      )

  }).pipe(

    finalize(() => {
      this.requestInProgress = false;
      this.loading = false;
      this.refreshing = false;
      this.hasLoaded = true;

      this.cdr.detectChanges();
    })

  ).subscribe({

    next: (response) => {

      this.emailEndpoints =
        this.normalizeList(response.emailEndpoints);

      this.webhookEndpoints =
        this.normalizeList(response.webhookEndpoints);

      this.emailDeliveries =
        this.normalizeList(response.emailDeliveries);

      this.webhookDeliveries =
        this.normalizeList(response.webhookDeliveries);

      console.log('[Integrations] Data loaded:', {
        emailEndpoints: this.emailEndpoints.length,
        webhookEndpoints: this.webhookEndpoints.length,
        emailDeliveries: this.emailDeliveries.length,
        webhookDeliveries: this.webhookDeliveries.length
      });

    },

    error: (error) => {

      console.error(
        '[Integrations] Loading failed:',
        error
      );

      this.errorMessage =
        this.getErrorMessage(error);
    }

  });
}
// ================================
// REFRESH INTEGRATION DATA
// ================================

refresh(): void {
  if (this.requestInProgress) {
    return;
  }

  this.loadData();
}
// ================================
// NORMALIZE API RESPONSE
// ================================

private normalizeList(response: any): any[] {

  // API returns a direct array
  if (Array.isArray(response)) {
    return response;
  }

  // API returns paginated results
  if (Array.isArray(response?.results)) {
    return response.results;
  }

  // API returns data inside a data property
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  console.warn(
    '[Integrations] Unexpected API response:',
    response
  );

  return [];
}
  // ================================
  // SUMMARY COUNTS
  // ================================

  get totalEndpoints(): number {
    return (
      this.emailEndpoints.length +
      this.webhookEndpoints.length
    );
  }

  get activeEndpoints(): number {
    return [
      ...this.emailEndpoints,
      ...this.webhookEndpoints
    ].filter(endpoint => endpoint.is_active).length;
  }

  get totalDeliveries(): number {
    return (
      this.emailDeliveries.length +
      this.webhookDeliveries.length
    );
  }

  get failedDeliveries(): number {
    return [
      ...this.emailDeliveries,
      ...this.webhookDeliveries
    ].filter(
      delivery =>
        String(delivery.status).toUpperCase() === 'FAILED'
    ).length;
  }

  // ================================
  // TABS
  // ================================

  setTab(tab: IntegrationTab): void {
    this.activeTab = tab;
    this.selectedDelivery = null;
    this.successMessage = '';
  }

  // ================================
  // CREATE ENDPOINT FORM
  // ================================

  openCreateForm(
    type: 'email' | 'webhook'
  ): void {
    this.createFormType = type;
    this.selectedEvents = [];
    this.successMessage = '';
    this.errorMessage = '';
  }

  closeCreateForm(): void {
    this.createFormType = null;

    this.emailForm = {
      name: '',
      email: ''
    };

    this.webhookForm = {
      name: '',
      url: ''
    };

    this.selectedEvents = [];
  }

  toggleEvent(
    event: string,
    checked: boolean
  ): void {
    if (checked) {
      if (!this.selectedEvents.includes(event)) {
        this.selectedEvents.push(event);
      }
    } else {
      this.selectedEvents =
        this.selectedEvents.filter(
          item => item !== event
        );
    }
  }

  // ================================
  // SAVE ENDPOINT
  // ================================

  saveEndpoint(): void {
    if (this.saving || !this.createFormType) {
      return;
    }

    const events = [...this.selectedEvents];

    if (this.createFormType === 'email') {
      if (
        !this.emailForm.name.trim() ||
        !this.emailForm.email.trim()
      ) {
        this.errorMessage =
          'Please enter the endpoint name and email address.';
        return;
      }
    }

    if (this.createFormType === 'webhook') {
      if (
        !this.webhookForm.name.trim() ||
        !this.webhookForm.url.trim()
      ) {
        this.errorMessage =
          'Please enter the endpoint name and webhook URL.';
        return;
      }
    }

    const request =
      this.createFormType === 'email'
        ? this.integrationService.createEmailEndpoint({
            name: this.emailForm.name.trim(),
            email: this.emailForm.email.trim(),
            events,
            is_active: true
          })
        : this.integrationService.createWebhookEndpoint({
            name: this.webhookForm.name.trim(),
            url: this.webhookForm.url.trim(),
            events,
            is_active: true
          });

    this.saving = true;
    this.errorMessage = '';

    request.pipe(
      finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      })
    ).subscribe({

      next: () => {
        this.successMessage =
          'Integration endpoint created successfully.';

        this.closeCreateForm();
        this.loadDataAfterSave();
      },

      error: (error) => {
        console.error(
          '[Integrations] Endpoint creation failed:',
          error
        );

        this.errorMessage =
          this.getErrorMessage(error);
      }

    });
  }

  private loadDataAfterSave(): void {
    // The save request has completed, so refresh can start.
    this.loadData();
  }

  // ================================
  // ENABLE / DISABLE ENDPOINT
  // ================================

  toggleEndpoint(
    endpoint: IntegrationEndpoint,
    channel: 'email' | 'webhook'
  ): void {
    const updatedStatus = !endpoint.is_active;

    const request =
      channel === 'email'
        ? this.integrationService.updateEmailEndpoint(
            endpoint.id,
            { is_active: updatedStatus }
          )
        : this.integrationService.updateWebhookEndpoint(
            endpoint.id,
            { is_active: updatedStatus }
          );

    request.subscribe({

      next: () => {
        endpoint.is_active = updatedStatus;

        this.successMessage = updatedStatus
          ? 'Endpoint activated successfully.'
          : 'Endpoint deactivated successfully.';

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error(
          '[Integrations] Endpoint update failed:',
          error
        );

        this.errorMessage =
          this.getErrorMessage(error);

        this.cdr.detectChanges();
      }

    });
  }

  // ================================
  // DELIVERY LOGS
  // ================================

  get deliveryRows(): DeliveryRow[] {
    const emails: DeliveryRow[] =
      this.emailDeliveries.map(delivery => ({
        ...delivery,
        channel: 'EMAIL'
      }));

    const webhooks: DeliveryRow[] =
      this.webhookDeliveries.map(delivery => ({
        ...delivery,
        channel: 'WEBHOOK'
      }));

    return [...emails, ...webhooks].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );
  }

  get filteredDeliveries(): DeliveryRow[] {
    if (this.deliveryFilter === 'ALL') {
      return this.deliveryRows;
    }

    if (this.deliveryFilter === 'EMAIL') {
      return this.deliveryRows.filter(
        row => row.channel === 'EMAIL'
      );
    }

    if (this.deliveryFilter === 'WEBHOOK') {
      return this.deliveryRows.filter(
        row => row.channel === 'WEBHOOK'
      );
    }

    return this.deliveryRows.filter(
      row =>
        String(row.status).toUpperCase() ===
        this.deliveryFilter
    );
  }

  getDeliveryTarget(row: DeliveryRow): string {
    if (row.channel === 'EMAIL') {
      return row.email || row.endpoint_name || '-';
    }

    return row.endpoint_name || '-';
  }

  getDeliveryError(row: DeliveryRow): string {
    return (
      row.error_message ||
      row.response_body ||
      ''
    );
  }

  getStatusClass(status: string): string {
    switch (String(status || '').toUpperCase()) {
      case 'SUCCESS':
        return 'status-success';

      case 'FAILED':
        return 'status-failed';

      case 'PENDING':
        return 'status-pending';

      default:
        return 'status-default';
    }
  }

  formatEvent(event: string): string {
    return String(event || '-')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // ================================
  // VIEW DELIVERY DETAILS
  // ================================

  openDeliveryDetails(row: DeliveryRow): void {
    this.selectedDelivery = row;
  }

  closeDeliveryDetails(): void {
    this.selectedDelivery = null;
  }

  formatJson(value: any): string {
    if (value === null || value === undefined) {
      return 'No data available';
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  // ================================
  // RETRY FAILED DELIVERY
  // ================================

  retryDelivery(row: DeliveryRow): void {
    if (
      String(row.status).toUpperCase() !== 'FAILED'
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Retry this ${row.channel.toLowerCase()} delivery?`
    );

    if (!confirmed) {
      return;
    }

    const request =
      row.channel === 'EMAIL'
        ? this.integrationService.retryEmailDelivery(row.id)
        : this.integrationService.retryWebhookDelivery(row.id);

    request.subscribe({

      next: () => {
        this.successMessage =
          `${row.channel} retry queued successfully.`;

        this.selectedDelivery = null;

        this.loadData();
      },

      error: (error) => {
        console.error(
          '[Integrations] Retry failed:',
          error
        );

        this.errorMessage =
          this.getErrorMessage(error);

        this.cdr.detectChanges();
      }

    });
  }

  // ================================
  // ERROR MESSAGE
  // ================================

  private getErrorMessage(error: any): string {
    if (error?.status === 401) {
      return 'Authentication failed. Please login again.';
    }

    if (error?.status === 403) {
      return 'You do not have permission to manage integrations.';
    }

    if (error?.status === 0) {
      return 'Unable to connect to the backend server.';
    }

    const body = error?.error;

    if (body && typeof body === 'object') {
      const firstValue = Object.values(body)[0];

      if (Array.isArray(firstValue)) {
        return String(firstValue[0]);
      }

      if (typeof firstValue === 'string') {
        return firstValue;
      }

      if (typeof body.detail === 'string') {
        return body.detail;
      }

      if (typeof body.error === 'string') {
        return body.error;
      }
    }

    return 'Unable to complete the integration request.';
  }
}