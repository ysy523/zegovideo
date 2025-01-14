import { Component } from '@angular/core';
import { AuthService } from '../services/Auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class LoginComponent {
  credentials = { username: '', password: '' };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    console.log('Login attempt:', this.credentials);
    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        if (response.success) {
          localStorage.setItem('token', response.user.token);
          this.router.navigate(['/video-call']);
        } else {
          alert(response.message);
        }
      },
      error: (error) => {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
      }
    });
  }
}

