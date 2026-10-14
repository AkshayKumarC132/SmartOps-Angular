
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

// ============================================================
// ORGANIZATION RECORD TYPE
// ============================================================

type OrganizationRecord = {
  organization_id?: number | string | null;
  organizationId?: number | string | null;

  organization?:
    | number
    | string
    | {
        id?: number | string;
        ID?: number | string;
        pk?: number | string;
      }
    | null;

  tenant_id?: number | string | null;
  tenantId?: number | string | null;

  [key: string]: unknown;
};

// ============================================================
// ORGANIZATION CONTEXT SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class OrganizationContextService {

  constructor(
    private readonly authService: AuthService
  ) {}

  // ==========================================================
  // NORMALIZE ORGANIZATION ID
  // ==========================================================

  private normalizeId(
    value: unknown
  ): string | null {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    if (typeof value === 'object') {

      const obj = value as {
        id?: unknown;
        ID?: unknown;
        pk?: unknown;
      };

      return this.normalizeId(
        obj.id ?? obj.ID ?? obj.pk
      );
    }

    const normalized = String(value).trim();

    return normalized || null;
  }

  // ==========================================================
  // READ ORGANIZATION ID
  // ==========================================================

  private readOrganizationId(
    user: OrganizationRecord | null | undefined
  ): string | null {

    if (!user) {
      return null;
    }

    return this.normalizeId(
      user.organization_id ??
      user.organizationId ??
      user.organization ??
      user.tenant_id ??
      user.tenantId
    );
  }

  // ==========================================================
  // GET CURRENT ORGANIZATION ID
  // ==========================================================

  getCurrentOrganizationId(): string | null {

    const user = (
      this.authService.getUser()
    ) as OrganizationRecord | null;

    const organizationId =
      this.readOrganizationId(user);

    if (organizationId !== null) {
      return organizationId;
    }

    // Fallback: inspect organization claims in the JWT.
    // Decoding a JWT does not verify its signature.

    const token =
      this.authService.getAccessToken();

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

      const decodedPayload = atob(payload);

      const claims = JSON.parse(
        decodedPayload
      ) as OrganizationRecord;

      return this.readOrganizationId(claims);

    } catch {
      return null;
    }
  }

  // ==========================================================
  // FILTER RECORDS BY ORGANIZATION
  // ==========================================================

  filterRecords<T extends OrganizationRecord>(
    records: T[]
  ): T[] {

    const currentOrganizationId =
      this.getCurrentOrganizationId();

    if (
      currentOrganizationId === null ||
      !records.length
    ) {
      return records;
    }

    // Check whether records contain organization metadata.
    const hasOrganizationMetadata = records.some(
      record =>
        this.readOrganizationId(record) !== null
    );

    // Do not guess the organization when metadata is absent.
    // The backend must already scope these records correctly.
    if (!hasOrganizationMetadata) {
      return records;
    }

    return records.filter(
      record =>
        this.readOrganizationId(record) ===
        currentOrganizationId
    );
  }
}
