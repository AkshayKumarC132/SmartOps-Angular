
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './services/notifications.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  constructor(
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Start global notification polling regardless of the current route.
    this.notificationService.startPolling();
  }
}
