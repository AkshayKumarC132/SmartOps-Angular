import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [],
  templateUrl: './integrations.html',
  styleUrl: './integrations.css'
})
export class Integrations {

  constructor(
    private router: Router
  ) {}

  goToEmailEndpoints(): void {
    this.router.navigate([
      '/email-endpoints'
    ]);
  }

  goToEmailDeliveries(): void {
    this.router.navigate([
      '/email-deliveries'
    ]);
  }

  goToWebhookEndpoints(): void {
    this.router.navigate([
      '/webhook-endpoints'
    ]);
  }

  goToWebhookDeliveries(): void {
    this.router.navigate([
      '/webhook-deliveries'
    ]);
  }

  goBack(): void {
    this.router.navigate([
      '/dashboard'
    ]);
  }
}