import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountService, AccountRequest } from '../../services/account.service';
import { CheckService, CheckRequest, DerogationRequest } from '../../services/check.service';
import { AuthService } from '../../services/auth.service';
import { Subscription, forkJoin } from 'rxjs';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentDate: Date = new Date();
  
  // Dashboard statistics
  stats = {
    totalAccounts: 0,
    pendingAccountRequests: 0,
    pendingCheckRequests: 0,
    totalTransactions: 0
  };

  // Recent account requests
  recentAccountRequests: any[] = [];
  
  // Recent check requests
  recentCheckRequests: any[] = [];
  
  // Recent transactions (for future implementation)
  recentTransactions: any[] = [];
  
  // Derogation requests
  recentDerogationRequests: DerogationRequest[] = [];

  // For cleanup
  private subscriptions: Subscription = new Subscription();

  constructor(
    private accountService: AccountService,
    private checkService: CheckService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadDashboardData(): void {
    // Use forkJoin to load all data in parallel
    const dataSubscription = forkJoin({
      accountRequests: this.accountService.getAccountRequestsFromDemande(),
      checkRequests: this.checkService.getCheckRequestsFromCheque(),
      derogationRequests: this.checkService.getDerogationRequests(),
      totalAccounts: this.authService.getTotalAccountsCount(),
      accountRequestsCount: this.accountService.getAccountRequestsCount(),
      checkRequestsCount: this.checkService.getCheckRequestsCount(),
      derogationRequestsCount: this.checkService.getDerogationRequestsCount()
    }).subscribe({
      next: ({ 
        accountRequests, 
        checkRequests, 
        derogationRequests, 
        totalAccounts,
        accountRequestsCount,
        checkRequestsCount,
        derogationRequestsCount
      }) => {
        // Update stats with real counts
        this.updateStats(
          totalAccounts,
          accountRequestsCount,
          checkRequestsCount,
          derogationRequestsCount
        );
        
        // Process account requests
        this.processAccountRequests(accountRequests);
        
        // Process check requests
        this.processCheckRequests(checkRequests);
        
        // Process derogation requests
        this.processDerogationRequests(derogationRequests);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
      }
    });

    this.subscriptions.add(dataSubscription);
  }

  updateStats(
    totalAccounts: number, 
    accountRequestsCount: number, 
    checkRequestsCount: number,
    derogationRequestsCount: number
  ): void {
    this.stats = {
      totalAccounts: totalAccounts, // Actual accounts from authentication collection
      pendingAccountRequests: accountRequestsCount, // Requests from 'demande' collection
      pendingCheckRequests: checkRequestsCount, // Requests from 'cheque' collection
      totalTransactions: derogationRequestsCount // Using derogations count as a proxy for transactions
    };
  }

  // Helper method to safely get a JavaScript Date from various date formats
  safeGetDate(dateValue: Date | Timestamp | undefined): Date | null {
    if (!dateValue) {
      return null;
    }
    
    // Handle Firestore Timestamp
    if (typeof dateValue === 'object' && 'toDate' in dateValue) {
      return dateValue.toDate();
    }
    
    // Handle regular Date objects
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Handle string or number
    return new Date(dateValue);
  }

  processAccountRequests(requests: AccountRequest[]): void {
    // Sort by date (newest first) and take the first 4
    this.recentAccountRequests = requests
      .sort((a, b) => {
        const dateA = this.safeGetDate(a.requestDate);
        const dateB = this.safeGetDate(b.requestDate);
        // Return 0 if either date is null (to prevent errors)
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 4)
      .map(req => ({
        id: req.id,
        name: req.customerName,
        type: req.accountType,
        date: this.safeGetDate(req.requestDate),
        status: req.status
      }));
  }

  processCheckRequests(requests: CheckRequest[]): void {
    // Sort by date (newest first) and take the first 4
    this.recentCheckRequests = requests
      .sort((a, b) => {
        const dateA = this.safeGetDate(a.requestDate);
        const dateB = this.safeGetDate(b.requestDate);
        // Return 0 if either date is null (to prevent errors)
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 4)
      .map(req => ({
        id: req.id,
        account: req.accountNumber,
        name: req.customerName,
        date: this.safeGetDate(req.requestDate),
        status: req.status
      }));
  }

  processDerogationRequests(requests: DerogationRequest[]): void {
    // Sort by date (newest first) and take the first 4
    this.recentDerogationRequests = requests
      .filter(req => req.dateRequested !== undefined) // Filter out requests with undefined dates
      .sort((a, b) => {
        const dateA = this.safeGetDate(a.dateRequested);
        const dateB = this.safeGetDate(b.dateRequested);
        // Return 0 if either date is null (to prevent errors)
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 4);
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'status-success';
      case 'pending': return 'status-warning';
      case 'processing': return 'status-info';
      case 'rejected': return 'status-danger';
      default: return 'status-secondary';
    }
  }

  getTransactionTypeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'deposit': return 'transaction-deposit';
      case 'withdrawal': return 'transaction-withdrawal';
      case 'transfer': return 'transaction-transfer';
      default: return 'transaction-other';
    }
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' });
  }
}