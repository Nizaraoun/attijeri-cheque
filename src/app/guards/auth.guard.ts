import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isLoggedIn()) {
    return true;
  }
  
  // If not logged in, redirect to login page
  router.navigate(['/auth/login'], { replaceUrl: true });
  return false;
};

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (!authService.isLoggedIn()) {
    return true;
  }
  
  // If already logged in and trying to access login/signup pages, redirect to dashboard
  router.navigate(['/dashboard'], { replaceUrl: true });
  return false;
};