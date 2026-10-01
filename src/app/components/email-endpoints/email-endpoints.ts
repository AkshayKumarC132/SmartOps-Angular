import {ChangeDetectorRef,Component,OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IntegrationService } from '../../services/integration.service';

@Component({
  selector: 'app-email-endpoints',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './email-endpoints.html',
  styleUrl: './email-endpoints.css'
})
export class EmailEndpoints implements OnInit {

  emailEndpoints: any[] = [];

  loading = true;
  errorMessage = '';

  constructor(
    private integrationService: IntegrationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEmailEndpoints();
  }

  loadEmailEndpoints(): void {

    this.loading = true;
    this.errorMessage = '';

    this.integrationService
      .getEmailEndpoints()
      .subscribe({

        next: (response) => {

          console.log(
            'Email endpoints:',
            response
          );

          this.emailEndpoints = response;

          this.loading = false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Email endpoints error:',
            error
          );

          this.loading = false;

          if (error.status === 401) {

            this.errorMessage =
              'Authentication failed. Please login again.';

          } else if (error.status === 403) {

            this.errorMessage =
              'You do not have permission to view email endpoints.';

          } else {

            this.errorMessage =
              'Unable to load email endpoints.';
          }

          this.cdr.detectChanges();
        }

      });
  }

  goBack(): void {
    this.router.navigate([
      '/integrations'
    ]);
  }
}