import {
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',

  standalone: true,

  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],

  templateUrl: './admin-layout.html',

  styleUrl: './admin-layout.css'
})
export class AdminLayout implements OnInit {

  user: any = null;

  notificationCount = 0;


  constructor(
    private authService: AuthService,
    private router: Router
  ) {}


  ngOnInit(): void {

    this.loadUser();

  }


  private loadUser(): void {

    this.user = this.authService.getUser();

    console.log(
      'Admin Layout User:',
      this.user
    );

    console.log(
      'Username:',
      this.user?.Username
    );

    console.log(
      'Role:',
      this.user?.Role
    );

  }


  /*
   * First letter of logged-in username
   *
   * Example:
   * Username = "s"
   * Avatar = "S"
   */

  get avatarLetter(): string {

    const username =
      this.user?.Username ||
      this.user?.username ||
      '';

    if (!username) {

      return '';

    }

    return username
      .trim()
      .charAt(0)
      .toUpperCase();

  }


  /*
   * Logged-in user's role
   */

  get userRole(): string {

    return (
      this.user?.Role ||
      this.user?.role ||
      'Admin'
    );

  }


  /*
   * Logout
   */

  logout(): void {

    this.authService.logout();

    this.router.navigate([
      '/login'
    ]);

  }

}