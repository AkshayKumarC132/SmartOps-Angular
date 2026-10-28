import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

type OrganizationRecord = {
  id?: unknown;
  ID?: unknown;
  Id?: unknown;
  pk?: unknown;

  organization_id?: unknown;
  organizationId?: unknown;
  'Organization Id'?: unknown;
  'Organization ID'?: unknown;
  Organization_Id?: unknown;
  OrganizationId?: unknown;
  organization?: unknown;
  Organization?: unknown;

  tenant_id?: unknown;
  tenantId?: unknown;
  tenant?: unknown;
  Tenant?: unknown;

  slug?: unknown;
  name?: unknown;

  [key: string]: unknown;
};

@Injectable({
  providedIn: 'root'
})
export class OrganizationContextService {
  constructor(
    private readonly authService: AuthService
  ) {}

  private normalizeId(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'object') {
      const organization = value as OrganizationRecord;

      return this.normalizeId(
        organization.id ??
        organization.ID ??
        organization.Id ??
        organization.pk ??
        organization.organization_id ??
        organization.organizationId ??
        organization['Organization Id'] ??
        organization['Organization ID'] ??
        organization.Organization_Id ??
        organization.OrganizationId ??
        organization.slug
      );
    }

    const normalized = String(value).trim();
    return normalized ? normalized.toLowerCase() : null;
  }

  private readExplicitOrganizationId(
    record: OrganizationRecord | null | undefined
  ): string | null {
    if (!record) {
      return null;
    }

    return this.normalizeId(
      record.organization_id ??
      record.organizationId ??
      record['Organization Id'] ??
      record['Organization ID'] ??
      record.Organization_Id ??
      record.OrganizationId ??
      record.tenant_id ??
      record.tenantId
    );
  }

  private readOrganizationId(
    record: OrganizationRecord | null | undefined
  ): string | null {
    if (!record) {
      return null;
    }

    const explicitId = this.readExplicitOrganizationId(record);

    if (explicitId !== null) {
      return explicitId;
    }

    return this.normalizeId(
      record.organization ??
      record.Organization ??
      record.tenant ??
      record.Tenant
    );
  }

  getCurrentOrganizationId(): string | null {
    const user = this.authService.getUser() as
      | OrganizationRecord
      | null;

    const userOrganizationId =
      this.readExplicitOrganizationId(user);

    if (userOrganizationId !== null) {
      return userOrganizationId;
    }

    const token = this.authService.getAccessToken();

    if (token) {
      try {
        const parts = token.split('.');

        if (parts.length === 3) {
          let payload = parts[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/');

          while (payload.length % 4 !== 0) {
            payload += '=';
          }

          const claims = JSON.parse(
            atob(payload)
          ) as OrganizationRecord;

          const tokenOrganizationId =
            this.readExplicitOrganizationId(claims);

          if (tokenOrganizationId !== null) {
            return tokenOrganizationId;
          }

          const tokenOrganization = this.readOrganizationId(claims);

          if (tokenOrganization !== null) {
            return tokenOrganization;
          }
        }
      } catch {
        // Continue to the user object when the token cannot be decoded.
      }
    }

    return this.readOrganizationId(user);
  }

  filterRecords<T extends OrganizationRecord>(records: T[]): T[] {
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    const currentOrganizationId = this.getCurrentOrganizationId();

    const recordsHaveOrganizationMetadata = records.some(
      record => this.readOrganizationId(record) !== null
    );

    // Fail closed if records expose organization metadata but the current
    // user's organization cannot be determined.
    if (
      recordsHaveOrganizationMetadata &&
      currentOrganizationId === null
    ) {
      return [];
    }

    // Some endpoints may already be scoped by the backend and omit metadata.
    // This preserves existing behavior but does not replace API authorization.
    if (!recordsHaveOrganizationMetadata) {
      return records;
    }

    return records.filter(
      record => this.readOrganizationId(record) === currentOrganizationId
    );
  }
}