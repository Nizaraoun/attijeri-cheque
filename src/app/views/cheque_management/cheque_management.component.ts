import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CheckService, DemandeCheque } from '../../services/check.service';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-cheque-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cheque_management.component.html',
  styleUrls: ['./cheque_management.component.scss']
})
export class ChequeManagementComponent implements OnInit {
  allChequeRequests: DemandeCheque[] = [];
  selectedChequeRequest: DemandeCheque | null = null;
  selectedId: string | null = null;
  statusOptions: string[] = ['pending', 'processing', 'completed', 'rejected'];
  isLoading: boolean = true;
  error: string | null = null;
  
  constructor(
    private checkService: CheckService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Always fetch all requests for the sidebar
    this.fetchAllChequeRequests();
    
    // Check if we have an ID from the route
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.selectedId = params['id'];
        if (this.selectedId) {
          this.fetchChequeRequestDetails(this.selectedId);
        }
      }
    });
  }

  fetchAllChequeRequests(): void {
    this.isLoading = true;
    this.error = null;
    
    this.checkService.getAllChequeRequests()
      .subscribe({
        next: (data) => {
          this.allChequeRequests = data;
          this.isLoading = false;
          
          // If we have a selected ID, make sure it's in our list
          if (this.selectedId) {
            this.selectChequeRequest(this.selectedId);
          }
        },
        error: (error) => {
          console.error('Error fetching cheque requests:', error);
          this.error = 'Error fetching data from database';
          this.isLoading = false;
        }
      });
  }

  // Select a cheque request from the list
  selectChequeRequest(id: string): void {
    if (!id) return;
    
    this.selectedId = id;
    this.selectedChequeRequest = this.allChequeRequests.find(req => req.id === id) || null;
    
    // If not found in existing data, fetch it from the database
    if (!this.selectedChequeRequest) {
      this.fetchChequeRequestDetails(id);
    }
    
    // Update URL without causing a full page reload
    this.router.navigate(['/cheque-management', id], { 
      skipLocationChange: false,
      replaceUrl: false
    });
  }

  updateStatus(newStatus: string): void {
    if (!this.selectedChequeRequest || !this.selectedId) return;
    
    this.isLoading = true;
    
    this.checkService.updateChequeRequestStatus(this.selectedId, newStatus)
      .subscribe({
        next: (success) => {
          if (success && this.selectedChequeRequest) {
            this.selectedChequeRequest.status = newStatus;
            
            // Also update the status in the full list
            const index = this.allChequeRequests.findIndex(req => req.id === this.selectedId);
            if (index !== -1) {
              this.allChequeRequests[index].status = newStatus;
            }
          } else {
            this.error = 'Failed to update status';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error updating status:', error);
          this.error = 'Error updating status';
          this.isLoading = false;
        }
      });
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return '';
    
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }

  // Method to handle Firestore Timestamp objects
  formatFirestoreDate(date: any): Date {
    if (!date) return new Date();
    
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && 'toDate' in date) {
      return date.toDate();
    }
    
    // Handle regular Date objects or strings
    return new Date(date);
  }

  formatDate(date: Date | Timestamp | undefined): string {
    if (!date) return '';

    const dateObj = this.formatFirestoreDate(date);
    
    return dateObj.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }

  // Fetch a specific cheque request details
  fetchChequeRequestDetails(id: string): void {
    this.isLoading = true;
    this.error = null;
    
    this.checkService.getChequeRequestById(id)
      .subscribe({
        next: (data) => {
          this.selectedChequeRequest = data;
          if (!this.selectedChequeRequest) {
            this.error = 'Cheque request not found';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching cheque request:', error);
          this.error = 'Error fetching data from database';
          this.isLoading = false;
        }
      });
  }
}