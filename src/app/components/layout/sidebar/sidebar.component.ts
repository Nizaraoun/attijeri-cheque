import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() activeSection = 'dashboard';
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() activeSectionChange = new EventEmitter<string>();
  
  userName = 'Admin Utilisateur';
  userRole = 'Directeur de Banque';

  menuItems: MenuItem[] = [
    { label: 'Tableau de Bord', icon: 'dashboard', route: 'dashboard' },
    { label: 'Création de Client', icon: 'person_add_alt', route: 'client-creation' },
    { label: 'Demandes de Compte', icon: 'person_add', route: 'account-requests' },
    { label: 'Chèques Client terminer', icon: 'chrome_reader_mode', route: 'check-requests' },
    { label: 'Gestion Carnets Chèques', icon: 'account_balance_wallet', route: 'cheque-management' },
    { label: 'Administration', icon: 'settings', route: 'admin-settings' },
    { label: 'Annonces', icon: 'notifications', route: 'announcement' }
  ];

  constructor(private authService: AuthService) {
    // Get user info from AuthService if available
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.fullName;
        this.userRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      }
    });
  }

  toggleSidebar() {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  setActiveSection(route: string) {
    this.activeSection = route;
    this.activeSectionChange.emit(route);
  }

  logout() {
    this.authService.logout();
  }
}