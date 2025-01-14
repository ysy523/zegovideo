import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/Auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: true,
  imports: [
    CommonModule
  ]
})
export class HeaderComponent {
  user: any; 
  constructor(private authService: AuthService,private router: Router) {
   
  }

  ngOnInit() {
    this.authService.getCurrentUser().subscribe((user) => {
      this.user = user;
    });
  }
  // dashboard.component.ts
logout() {
  this.authService.logout();
  this.router.navigate(['/login']);
}
}
