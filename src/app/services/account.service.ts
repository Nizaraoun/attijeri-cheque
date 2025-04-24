import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { getFirestore, collection, query, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { firestore } from '../../environments/environment';

export interface AccountRequest {
  id?: string;
  customerName: string;
  customerID: string;
  email: string;
  phone: string;
  accountType: 'savings' | 'current' | 'business' | 'investment';
  requestDate: Timestamp | Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  reason?: string;
  initialDeposit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private db: any;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Initialize Firestore only in browser environment
    if (this.isBrowser) {
      this.db = getFirestore();
    }
  }

  getAccountRequests(): Observable<AccountRequest[]> {
    if (!this.isBrowser) {
      return of([]);
    }

    const accountRequestsRef = collection(firestore, 'accountRequests');
    const accountRequestsQuery = query(accountRequestsRef);

    return from(getDocs(accountRequestsQuery)).pipe(
      map(snapshot => {
        const requests: AccountRequest[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as Omit<AccountRequest, 'id'>;
          requests.push({
            id: doc.id,
            ...data
          });
        });
        return requests;
      }),
      catchError(error => {
        console.error('Error fetching account requests:', error);
        return of([]);
      })
    );
  }

  // Mock data for demonstration purposes
  
  // Update account request status
  updateAccountRequestStatus(requestId: string, newStatus: 'pending' | 'processing' | 'completed' | 'rejected', reason?: string): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    // For now, just return a successful update
    // In a real app, you would update the document in Firestore
    return of(true);
  }

  // Create new account request
  createAccountRequest(request: Omit<AccountRequest, 'id' | 'requestDate' | 'status'>): Observable<AccountRequest> {
    // Mock implementation for demonstration
    const newRequest: AccountRequest = {
      ...request,
      id: `REQ-${Math.floor(Math.random() * 1000)}`,
      requestDate: new Date(),
      status: 'pending'
    };

    return of(newRequest);
  }

  // Get account requests count from the 'demande' collection
  getAccountRequestsCount(): Observable<number> {
    if (!this.isBrowser) {
      return of(0);
    }

    const demandeRef = collection(firestore, 'demande');
    const demandeQuery = query(demandeRef);

    return from(getDocs(demandeQuery)).pipe(
      map(snapshot => snapshot.size),
      catchError(error => {
        console.error('Error counting account requests:', error);
        return of(0);
      })
    );
  }

  // Fetch account requests from the 'demande' collection
  getAccountRequestsFromDemande(): Observable<AccountRequest[]> {
    if (!this.isBrowser) {
      return of([]);
    }

    const demandeRef = collection(firestore, 'demande');
    const demandeQuery = query(demandeRef);

    return from(getDocs(demandeQuery)).pipe(
      map(snapshot => {
        const requests: AccountRequest[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          // Map the data from demande collection to AccountRequest format
          requests.push({
            id: doc.id,
            customerName: data['fullName'] || data['nom'] || '',
            customerID: data['id'] || data['client_id'] || '',
            email: data['email'] || '',
            phone: data['phone'] || data['telephone'] || '',
            accountType: data['accountType'] || 'current',
            requestDate: data['requestDate'] || data['date'] || new Date(),
            status: data['status'] || 'pending',
            reason: data['reason'] || '',
            initialDeposit: data['initialDeposit'] || 0
          });
        });
        return requests;
      }),
      catchError(error => {
        console.error('Error fetching demande collection:', error);
        return of([]);
      })
    );
  }
}