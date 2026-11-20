
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * Supported organization metadata in API responses and JWT claims.
 */
type OrganizationRecord = {
  organization_id?: number | string | null;
  organizationId?: number | string | null;
  organization?: number | string | Record<string, unknown> | null;
  tenant_id?: number | string | null;
  tenantId?: number | string | null;
  Organization?: unknown;
  'Organization Id'?: unknown;
  'Organization ID'?: unknown;
};

@Injectable({
  providedIn: 'root'
})
export class OrganizationContextService {

  private readonly apiUrl =
    environment.apiUrl.replace(/\/+$/, '');

  constructor(
    private readonly authService: AuthService,
    private readonly http: HttpClient
  ) {}

  // =========================================================
  // ORGANIZATION ID
  // =========================================================

  private normalizeId(value: unknown): string | null {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    if (typeof value === 'object') {

      const obj = value as Record<string, unknown>;

      return this.normalizeId(
        obj['id'] ??
        obj['ID'] ??
        obj['pk'] ??
        obj['organization_id'] ??
        obj['organizationId'] ??
        obj['Organization Id'] ??
        obj['Organization ID']
      );
    }

    return String(value).trim() || null;
  }

  private readOrganizationId(
    record: OrganizationRecord | null | undefined
  ): string | null {

    if (!record) {
      return null;
    }

    return this.normalizeId(
      record.organization_id ??
      record.organizationId ??
      record.organization ??
      record['Organization'] ??
      record['Organization Id'] ??
      record['Organization ID'] ??
      record.tenant_id ??
      record.tenantId
    );
  }

  getCurrentOrganizationId(): string | null {

    const currentUser = this.authService.getUser();

    const userOrganizationId =
      this.readOrganizationId(
        currentUser as OrganizationRecord | null
      );

    if (userOrganizationId !== null) {
      return userOrganizationId;
    }

    // Fall back to organization claims in the access token.
    const token = this.authService.getAccessToken();

    if (!token) {
      return null;
    }

    try {

      const parts = token.split('.');

      if (parts.length !== 3) {
        return null;
      }

      let payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      while (payload.length % 4 !== 0) {
        payload += '=';
      }

      const claims = JSON.parse(
        atob(payload)
      ) as OrganizationRecord;

      return this.readOrganizationId(claims);

    } catch {
      return null;
    }
  }

  // =========================================================
  // ORGANIZATION NAME
  // =========================================================

  private extractOrganizationName(
    value: unknown
  ): string | null {

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {

      const obj = value as Record<string, unknown>;

      const name =
        obj['name'] ??
        obj['organization_name'] ??
        obj['organizationName'] ??
        obj['Organization Name'] ??
        obj['OrganizationName'] ??
        obj['Name'] ??
        obj['title'];

      if (
        typeof name === 'string' &&
        name.trim()
      ) {
        return name.trim();
      }
    }

    return null;
  }

  private readOrganizationName(
    record: Record<string, unknown> | null | undefined
  ): string | null {

    if (!record) {
      return null;
    }

    return (
      this.extractOrganizationName(
        record['organization']
      ) ??
      this.extractOrganizationName(
        record['Organization']
      ) ??
      this.extractOrganizationName(
        record['organization_name']
      ) ??
      this.extractOrganizationName(
        record['organizationName']
      ) ??
      this.extractOrganizationName(
        record['Organization Name']
      ) ??
      this.extractOrganizationName(
        record['OrganizationName']
      ) ??
      this.extractOrganizationName(
        record['tenant']
      )
    );
  }

  /**
   * Gets the organization name from user data or JWT claims.
   */
  getCurrentOrganizationName(): string | null {

    const currentUser = this.authService.getUser() as
      Record<string, unknown> | null;

    const userOrganizationName =
      this.readOrganizationName(currentUser);

    if (userOrganizationName) {
      return userOrganizationName;
    }

    const token = this.authService.getAccessToken();

    if (!token) {
      return null;
    }

    try {

      const parts = token.split('.');

      if (parts.length !== 3) {
        return null;
      }

      let payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      while (payload.length % 4 !== 0) {
        payload += '=';
      }

      const claims = JSON.parse(atob(payload)) as
        Record<string, unknown>;

      return this.readOrganizationName(claims);

    } catch {
      return null;
    }
  }

  /**
   * Retrieves the actual organization name from Django.
   * Uses the organization detail endpoint.
   */
  fetchOrganizationName(
    organizationId: string | number
  ): Observable<string | null> {

    return this.http.get<any>(
      `${this.apiUrl}/organization/${organizationId}/`
    ).pipe(
      map((organization: any) => {

        return (
          organization?.name ??
          organization?.organization_name ??
          organization?.['Organization Name'] ??
          organization?.OrganizationName ??
          organization?.Name ??
          organization?.title ??
          null
        );
      }),

      catchError((error) => {

        console.error(
          'Unable to fetch organization name:',
          error
        );

        return of(null);
      })
    );
  }

  /**
   * Retrieves the current user's organization name.
   * First checks user/JWT data, then fetches from Django.
   */
  getCurrentOrganizationNameFromApi():
    Observable<string | null> {

    const existingName =
      this.getCurrentOrganizationName();

    if (existingName) {
      return of(existingName);
    }

    const organizationId =
      this.getCurrentOrganizationId();

    if (!organizationId) {
      return of(null);
    }

    return this.fetchOrganizationName(
      organizationId
    );
  }

  // =========================================================
  // ORGANIZATION RECORD FILTERING
  // =========================================================

  filterRecords<T>(records: T[]): T[] {

    const currentOrganizationId =
      this.getCurrentOrganizationId();

    if (
      currentOrganizationId === null ||
      records.length === 0
    ) {
      return records;
    }

    const organizationRecords = records as (
      T & OrganizationRecord
    )[];

    const containsOrganizationMetadata =
      organizationRecords.some(
        record =>
          this.readOrganizationId(record) !== null
      );

    if (!containsOrganizationMetadata) {
      return records;
    }

    return organizationRecords.filter(
      record =>
        this.readOrganizationId(record) ===
        currentOrganizationId
    );
  }
}
