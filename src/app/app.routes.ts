import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'auth', 
    pathMatch: 'full' 
  },
  // Auth routes with auth layout
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./views/auth/login/login.component').then(m => m.LoginComponent),
        canActivate: [loginGuard]
      },
    
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  // Main application routes with main layout
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { 
        path: 'dashboard', 
        loadComponent: () => import('./views/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
    
      { 
        path: 'announcement', 
        loadComponent: () => import('./views/announcement/announcement.component').then(m => m.AnnouncementComponent) 
      },
      {
        path: 'account-requests',
        loadComponent: () => import('./views/account-requests/account-requests.component').then(m => m.AccountRequestsComponent)
      },
      {
        path: 'check-requests',
        loadComponent: () => import('./views/check-requests/check-requests.component').then(m => m.CheckRequestsComponent)
      },
      {
        path: 'cheque-management',
        loadComponent: () => import('./views/cheque_management/cheque_management.component').then(m => m.ChequeManagementComponent)
      },
      {
        path: 'cheque-management/:id',
        loadComponent: () => import('./views/cheque_management/cheque_management.component').then(m => m.ChequeManagementComponent)
      },
      {
        path: 'admin-settings',
        loadComponent: () => import('./views/admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent)
      },
      {
        path: 'client-creation',
        loadComponent: () => import('./views/client-creation/client-creation.component').then(m => m.ClientCreationComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  { 
    path: '**', 
    redirectTo: 'dashboard' 
  }
];
