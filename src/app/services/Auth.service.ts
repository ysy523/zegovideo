// auth.service.ts
import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';

interface LoginResponse {
  success: boolean;
  user?: any;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private dummyUser = {
    id: 1,
    username: 'testuser',
    email: 'testuser@example.com',
    token: 'dummy-token',
  };

  constructor() {}

  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    if (credentials.username === 'abc' && credentials.password === 'abc') {
      return of({ success: true, user: this.dummyUser });
    } else {
      return of({ success: false, message: 'Invalid credentials' });
    }
  }
  // Check if the user is logged in
  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return !!token; // Return true if a token exists
  }

  // Get the current user (dummy data)
  getCurrentUser() {
    return of(this.dummyUser);
  }


  autoLogin() {
    const token = localStorage.getItem('token');
    if (token) {
      // Optionally, validate the token (e.g., check expiration)
      const user = { id: 1, username: 'testuser', email: 'testuser@example.com' }; // Replace with actual user data
      console.log('User auto-logged in');
      return of(true); // Return observable with user data
    }
    return of(false); // Return observable with null
  }

  // Logout the user
  logout() {
    localStorage.removeItem('token');
  }
}