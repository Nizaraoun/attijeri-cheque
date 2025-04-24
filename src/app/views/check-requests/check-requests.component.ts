import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckService, CheckRequest, IssuedCheque } from '../../services/check.service';

@Component({
  selector: 'app-check-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './check-requests.component.html',
  styleUrls: ['./check-requests.component.scss']
})
export class CheckRequestsComponent implements OnInit {
  // Check requests data
  isLoading = true;
  selectedRequest: CheckRequest | null = null;
  filterStatus: string = 'all';
  searchQuery: string = '';
  
  // Tabs navigation
  activeTab: 'requests' | 'pendingCheques' = 'requests';
  
  // Pending cheques data
  pendingCheques: IssuedCheque[] = [];
  isLoadingCheques = false;
  selectedCheque: IssuedCheque | null = null;
  isProcessing = false;
  
  // Document ID for cheques in Firestore (we'll set this when loading cheques)
  chequesDocId: string = 'check'; // Default document ID

  constructor(private checkService: CheckService) { }
  ngOnInit(): void {
    this.loadPendingCheques();
  }


  
  loadPendingCheques(): void {
    this.isLoadingCheques = true;
    this.pendingCheques = [];
    
    this.checkService.getPendingCheques().subscribe({
      next: (cheques) => {
        this.pendingCheques = cheques;
        this.isLoadingCheques = false;
      },
      error: (error) => {
        console.error('Error loading pending cheques:', error);
        this.isLoadingCheques = false;
      }
    });
  }
  
  deliverCheque(cheque: IssuedCheque): void {
    this.selectedCheque = cheque;
  }
  
  closeDeliveryConfirmation(): void {
    this.selectedCheque = null;
    this.isProcessing = false;
  }
  
  confirmDeliverCheque(): void {
    if (!this.selectedCheque) return;
    
    this.isProcessing = true;
    const chequeId = this.selectedCheque.id || this.selectedCheque.checkNumber;
    
    this.checkService.deliverChequeToClient(this.chequesDocId, chequeId).subscribe({
      next: (success) => {
        if (success) {
          // Remove the delivered cheque from the list
          this.pendingCheques = this.pendingCheques.filter(
            c => c.id !== chequeId && c.checkNumber !== chequeId
          );
          this.closeDeliveryConfirmation();
        } else {
          console.error('Failed to update cheque status');
          this.isProcessing = false;
        }
      },
      error: (error) => {
        console.error('Error delivering cheque:', error);
        this.isProcessing = false;
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'status-success';
      case 'pending': return 'status-warning';
      case 'processing': return 'status-info';
      case 'rejected': return 'status-danger';
      default: return '';
    }
  }

  formatDate(date: Date | any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-TN', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  viewRequestDetails(request: CheckRequest): void {
    this.selectedRequest = request;
  }

  closeDetails(): void {
    this.selectedRequest = null;
  }

  

  
}