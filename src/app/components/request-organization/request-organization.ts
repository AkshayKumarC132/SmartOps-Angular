
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { OrganizationContextService } from '../../services/organization-context.service';
import { OrganizationRequestService } from '../../services/organization-request.service';
import { ApiErrorService } from '../../services/api-error.service';

@Component({
  selector: 'app-request-organization',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './request-organization.html',
  styleUrl: './request-organization.css'
})
export class RequestOrganization implements OnInit {

  organizationName = '';
  reason = '';

  submitting = false;
  submitted = false;

  constructor(
    private readonly router: Router,
    private readonly organizationContext: OrganizationContextService,
    private readonly organizationRequestService: OrganizationRequestService,
    private readonly apiErrorService: ApiErrorService
  ) {}

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    this.checkOrganizationMembership();
  }

  // =========================================================
  // CHECK ORGANIZATION MEMBERSHIP
  // =========================================================

  private checkOrganizationMembership(): void {

    const organizationId =
      this.organizationContext.getCurrentOrganizationId();

    // If the Admin has no organization,
    // allow the request form to be displayed.
    if (organizationId === null) {
      return;
    }

    // Fetch the actual organization name.
    this.organizationContext
      .getCurrentOrganizationNameFromApi()
      .subscribe({

        next: (name) => {

          const displayName =
            name?.trim() || null;

          Swal.fire({
            icon: 'info',
            title: 'Already Part of an Organization',
            text: displayName
              ? `You are already part of ${displayName}.`
              : 'You are already part of an organization.',
            confirmButtonText: 'Go to Dashboard',
            allowOutsideClick: false,
            allowEscapeKey: false
          }).then(() => {

            void this.router.navigate(
              ['/dashboard'],
              {
                replaceUrl: true
              }
            );

          });
        },

        error: (error) => {

          console.error(
            'Organization lookup failed:',
            error
          );

          Swal.fire({
            icon: 'info',
            title: 'Already Part of an Organization',
            text: 'You are already part of an organization.',
            confirmButtonText: 'Go to Dashboard',
            allowOutsideClick: false,
            allowEscapeKey: false
          }).then(() => {

            void this.router.navigate(
              ['/dashboard'],
              {
                replaceUrl: true
              }
            );

          });
        }
      });
  }

  // =========================================================
  // SUBMIT ORGANIZATION REQUEST
  // =========================================================

  submitRequest(): void {

    const trimmedOrganizationName =
      this.organizationName.trim();

    const trimmedReason =
      this.reason.trim();

    // Validate fields.
    if (
      !trimmedOrganizationName ||
      !trimmedReason
    ) {

      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter the organization name and reason for your request.'
      });

      return;
    }

    if (
      this.submitting ||
      this.submitted
    ) {
      return;
    }

    this.submitting = true;

    // ============================================
    // SEND REQUEST TO DJANGO BACKEND
    // ============================================

    this.organizationRequestService
      .submitRequest({
        organization_name: trimmedOrganizationName,
        explanation: trimmedReason
      })
      .subscribe({

        // ============================================
        // SUCCESS
        // ============================================

        next: (response: any) => {

          console.log(
            'Organization request response:',
            response
          );

          this.submitting = false;
          this.submitted = true;

          Swal.fire({
            icon: 'success',
            title: 'Request Submitted',
            text:
              response?.message ||
              'Your organization request has been submitted successfully. It is awaiting Super Admin approval.',
            confirmButtonText: 'OK'
          });
        },

        // ============================================
        // ERROR
        // ============================================

        error: (error: any) => {

          console.error(
            'Organization request submission failed:',
            error
          );

          this.submitting = false;

          const errorMessage =
            this.apiErrorService.getErrorMessage(error);

          Swal.fire({
            icon: 'error',
            title: 'Request Failed',
            text: errorMessage
          });
        }
      });
  }

  // =========================================================
  // RESET FORM
  // =========================================================

  resetRequest(): void {

    this.organizationName = '';
    this.reason = '';
    this.submitted = false;
  }

  // =========================================================
  // NAVIGATE TO DASHBOARD
  // =========================================================

  goToDashboard(): void {

    void this.router.navigate(['/dashboard']);
  }
}
