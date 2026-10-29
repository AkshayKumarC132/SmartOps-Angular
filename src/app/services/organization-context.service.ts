
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Supported organization metadata in API responses and JWT claims.
 * Records do not need an index signature to be filtered.
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
  constructor(
    private readonly authService: AuthService
  ) {}

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

    const userOrganizationId = this.readOrganizationId(
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

  /**
   * Filters records by organization when organization metadata
   * is available in the response.
   *
   * Generic T intentionally has no OrganizationRecord constraint.
   * This allows interfaces such as User to be passed directly.
   *
   * If API records omit organization metadata, this method preserves
   * the response. The backend must enforce tenant authorization.
   */
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
        record => this.readOrganizationId(record) !== null
      );

    if (!containsOrganizationMetadata) {
      return records;
    }

    return organizationRecords.filter(
      record =>
        this.readOrganizationId(record) === currentOrganizationId
    );
  }
}
