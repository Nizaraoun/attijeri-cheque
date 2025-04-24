import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  sidebarCollapsed = false;
  activeSection = 'dashboard';
  pageTitle = 'Dashboard';

  toggleSidebar(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }

  updateActiveSection(route: string) {
    this.activeSection = route;
    this.updatePageTitle(route);
  }

  updatePageTitle(route: string) {
    // Convert route to title case for page title
    this.pageTitle = route.charAt(0).toUpperCase() + route.slice(1);
  }
}