import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm = {
    email: '',
    password: '',
    rememberMe: false
  };

  isLoading = false;
  errorMessage = '';

  constructor(private authService: AuthService) {}

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';
  

    this.authService.login(this.loginForm.email, this.loginForm.password)
      .subscribe({
        next: (response) => {
          console.log('Login successful', response);
          // Use window.location.href to force a complete page reload
          window.location.href = '/dashboard';
        },
        error: (error) => {
          this.errorMessage = error?.message || 'Invalid email or password';
          this.isLoading = false;
          console.error('Login failed:', error);
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }
}