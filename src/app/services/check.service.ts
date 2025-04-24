import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { getFirestore, collection, query, getDocs, addDoc, updateDoc, doc, Timestamp, getDoc, setDoc } from 'firebase/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { firestore } from '../../environments/environment';

export interface CheckRequest {
  id?: string;
  accountNumber: string;
  customerName: string;
  checkCount: number;
  requestDate: Timestamp | Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  reason?: string;
}

// Interfaces for the cheque management module
export interface EligibilityResponse {
  eligible: boolean;
  reason?: string;
  errorMessage?: string;
}

// New interface for issued cheques
export interface IssuedCheque {
  id: string;
  amount: number;
  bank: string;
  beneficier: string;
  checkNumber: string;
  confirmed: string;
  date: Timestamp | Date;
  date_of_scan: string;
  id_donateur: string;
  is_reserved: boolean;
  issuerBank: string;
  montant: string;
  nom: string;
  recipient: string;
  recipient_id: string;
  reservation_date: Timestamp | Date;
  status: string;
}

export interface EligibilityCriteria {
  cnp: string;
  classification: string;
  regularizedWarnings: number;
  checksInCirculation: number;
  hasClientOpposition: boolean;
  hasJudicialFreeze: boolean;
}

export interface ChequeBookOffer {
  cmcNet: number;
  sheetsCount: number;
  limitPerSheet: number;
  totalLimit: number;
  validityPeriod: number; // in months
}

export interface DerogationRequest {
  requestId: string;
  accountNumber: string;
  customerName: string;
  originalOffer: ChequeBookOffer;
  requestedSheetsCount?: number;
  requestedLimitPerSheet?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  dateRequested: Date | Timestamp;
}

// New interfaces for configurable settings
export interface EligibilitySettings {
  id?: string;
  maxCnpValue: string;
  maxClassificationValue: string;
  maxRegularizedWarnings: number;
  maxChecksInCirculation: number;
  lastUpdated: Timestamp | Date;
  updatedBy?: string;
}

export interface ChequeBookSettings {
  id?: string;
  cmcNetRanges: CmcNetRange[];
  lastUpdated: Timestamp | Date;
  updatedBy?: string;
}

export interface CmcNetRange {
  id?: string;
  minValue: number;
  maxValue: number;
  sheetsCount: number;
  limitPerSheet: number;
  totalLimit: number;
  validityPeriod: number; // in months
}

// New interface for the cheque request from 'demande_cheque' collection
export interface DemandeCheque {
  id?: string;
  adresseComplete?: string;
  agenceRetrait?: string;
  cin?: string;
  cmcNet?: number;
  email?: string;
  isExpedited?: boolean;
  limitPerSheet?: number;
  modeLivraison?: string;
  nom?: string;
  nombreCheques?: number;
  prenom?: string;
  requestDate?: Timestamp | Date;
  retrievalDate?: Timestamp | Date;
  rib?: string;
  status?: string;
  telephone?: string;
  totalLimit?: number;
  typeCheque?: string;
  userId?: string;
  validityPeriod?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CheckService {
  private db: any;
  private isBrowser: boolean;
  private eligibilitySettings: EligibilitySettings | null = null;
  private chequeBookSettings: ChequeBookSettings | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Initialize Firestore only in browser environment
    if (this.isBrowser) {
      this.db = getFirestore();
      this.loadSettings(); // Load settings on service initialization
    }
  }

  // Load settings from Firestore
  private loadSettings(): void {
    this.getEligibilitySettings().subscribe();
    this.getChequeBookSettings().subscribe();
  }

  getCheckRequests(): Observable<CheckRequest[]> {
    if (!this.isBrowser) {
      return of([]);
    }

    const checkRequestsRef = collection(firestore, 'checkRequests');
    const checkRequestsQuery = query(checkRequestsRef);

    return from(getDocs(checkRequestsQuery)).pipe(
      map(snapshot => {
        const requests: CheckRequest[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as Omit<CheckRequest, 'id'>;
          requests.push({
            id: doc.id,
            ...data
          });
        });
        return requests;
      }),
      catchError(error => {
        console.error('Error fetching check requests:', error);
        return of([]);
      })
    );
  }

  // Mock data for demonstration purposes
  
  // Update check request status
  updateCheckRequestStatus(requestId: string, newStatus: 'pending' | 'processing' | 'completed' | 'rejected', reason?: string): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    // For now, just return a successful update
    // In a real app, you would update the document in Firestore
    return of(true);
  }

  // Create new check request
  createCheckRequest(request: Omit<CheckRequest, 'id' | 'requestDate' | 'status'>): Observable<CheckRequest> {
    // Mock implementation for demonstration
    const newRequest: CheckRequest = {
      ...request,
      id: `CHK-${Math.floor(Math.random() * 1000)}`,
      requestDate: new Date(),
      status: 'pending'
    };

    return of(newRequest);
  }

  // Get eligibility settings - configurable by admin
  getEligibilitySettings(): Observable<EligibilitySettings> {
    if (!this.isBrowser) {
      return of(this.getDefaultEligibilitySettings());
    }

    if (this.eligibilitySettings) {
      return of(this.eligibilitySettings);
    }

    const settingsDoc = doc(firestore, 'settings', 'eligibilityCriteria');
    
    return from(getDoc(settingsDoc)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          this.eligibilitySettings = docSnap.data() as EligibilitySettings;
          return this.eligibilitySettings;
        } else {
          // Initialize with default settings if not found
          const defaultSettings = this.getDefaultEligibilitySettings();
          this.saveEligibilitySettings(defaultSettings).subscribe();
          return defaultSettings;
        }
      }),
      catchError(error => {
        console.error('Error fetching eligibility settings:', error);
        const defaultSettings = this.getDefaultEligibilitySettings();
        return of(defaultSettings);
      })
    );
  }

  // Get checkbook settings - configurable by admin
  getChequeBookSettings(): Observable<ChequeBookSettings> {
    if (!this.isBrowser) {
      return of(this.getDefaultChequeBookSettings());
    }

    if (this.chequeBookSettings) {
      return of(this.chequeBookSettings);
    }

    const settingsDoc = doc(firestore, 'settings', 'chequeBookSettings');
    
    return from(getDoc(settingsDoc)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          this.chequeBookSettings = docSnap.data() as ChequeBookSettings;
          return this.chequeBookSettings;
        } else {
          // Initialize with default settings if not found
          const defaultSettings = this.getDefaultChequeBookSettings();
          this.saveChequeBookSettings(defaultSettings).subscribe();
          return defaultSettings;
        }
      }),
      catchError(error => {
        console.error('Error fetching checkbook settings:', error);
        const defaultSettings = this.getDefaultChequeBookSettings();
        return of(defaultSettings);
      })
    );
  }

  // Save eligibility settings - for admin use
  saveEligibilitySettings(settings: EligibilitySettings): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    const settingsDoc = doc(firestore, 'settings', 'eligibilityCriteria');
    settings.lastUpdated = new Date();

    return from(setDoc(settingsDoc, settings)).pipe(
      map(() => {
        this.eligibilitySettings = settings;
        return true;
      }),
      catchError(error => {
        console.error('Error saving eligibility settings:', error);
        return of(false);
      })
    );
  }

  // Save checkbook settings - for admin use
  saveChequeBookSettings(settings: ChequeBookSettings): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    const settingsDoc = doc(firestore, 'settings', 'chequeBookSettings');
    settings.lastUpdated = new Date();

    return from(setDoc(settingsDoc, settings)).pipe(
      map(() => {
        this.chequeBookSettings = settings;
        return true;
      }),
      catchError(error => {
        console.error('Error saving checkbook settings:', error);
        return of(false);
      })
    );
  }

  // Default eligibility settings
  private getDefaultEligibilitySettings(): EligibilitySettings {
    return {
      maxCnpValue: '0',
      maxClassificationValue: '0',
      maxRegularizedWarnings: 8,
      maxChecksInCirculation: 15,
      lastUpdated: new Date()
    };
  }

  // Default checkbook settings
  private getDefaultChequeBookSettings(): ChequeBookSettings {
    return {
      cmcNetRanges: [
        {
          minValue: 1000,
          maxValue: 2000,
          sheetsCount: 15,
          limitPerSheet: 700,
          totalLimit: 10500,
          validityPeriod: 12
        },
        {
          minValue: 2001,
          maxValue: 3000,
          sheetsCount: 25,
          limitPerSheet: 1000,
          totalLimit: 25000,
          validityPeriod: 12
        },
        {
          minValue: 3001,
          maxValue: Number.MAX_SAFE_INTEGER,
          sheetsCount: 25,
          limitPerSheet: 1200,
          totalLimit: 30000,
          validityPeriod: 12
        }
      ],
      lastUpdated: new Date()
    };
  }

  // New methods for cheque management feature that use the configurable settings

  // Check eligibility criteria based on admin settings
  checkEligibility(accountNumber: string): Observable<EligibilityResponse> {
    // First get the criteria from the customer
    return this.getEligibilityCriteria(accountNumber).pipe(
      map(criteria => {
        if (!this.eligibilitySettings) {
          // If settings aren't loaded yet, use default
          this.eligibilitySettings = this.getDefaultEligibilitySettings();
        }
        
        // Check against configured settings
        const isEligible = 
          criteria.cnp === this.eligibilitySettings.maxCnpValue &&
          criteria.classification === this.eligibilitySettings.maxClassificationValue &&
          criteria.regularizedWarnings < this.eligibilitySettings.maxRegularizedWarnings &&
          criteria.checksInCirculation < this.eligibilitySettings.maxChecksInCirculation &&
          !criteria.hasClientOpposition &&
          !criteria.hasJudicialFreeze;
        
        if (isEligible) {
          return { eligible: true };
        } else {
          // Determine failure reason
          const reasons: string[] = [];
          
          if (criteria.cnp !== this.eligibilitySettings.maxCnpValue) {
            reasons.push('CNP classification not eligible');
          }
          
          if (criteria.classification !== this.eligibilitySettings.maxClassificationValue) {
            reasons.push('Customer classification not eligible');
          }
          
          if (criteria.regularizedWarnings >= this.eligibilitySettings.maxRegularizedWarnings) {
            reasons.push('Too many regularized warnings');
          }
          
          if (criteria.checksInCirculation >= this.eligibilitySettings.maxChecksInCirculation) {
            reasons.push('Too many checks in circulation');
          }
          
          if (criteria.hasClientOpposition) {
            reasons.push('Client opposition found');
          }
          
          if (criteria.hasJudicialFreeze) {
            reasons.push('Judicial freeze detected');
          }
          
          return { 
            eligible: false, 
            reason: reasons.join(', ')
          };
        }
      })
    );
  }

  // Get detailed eligibility criteria
  getEligibilityCriteria(accountNumber: string): Observable<EligibilityCriteria> {
    // Mock data - in a real app, this would come from backend APIs
    return of({
      cnp: '0', // 0 = good classification
      classification: '0', // 0 = good classification
      regularizedWarnings: Math.floor(Math.random() * 10), // Random number 0-9
      checksInCirculation: Math.floor(Math.random() * 20), // Random number 0-19
      hasClientOpposition: Math.random() > 0.8, // 20% chance of having opposition
      hasJudicialFreeze: Math.random() > 0.9 // 10% chance of having freeze
    });
  }

  // Get CMC Net value for the customer
  getCustomerCMCNet(accountNumber: string): Observable<number> {
    // Mock implementation - returns a random CMC Net value
    // In real app, this would call a backend API
    const randomCMCNet = Math.floor(Math.random() * 5000); // Random 0-5000
    return of(randomCMCNet);
  }

  // Get cheque book offer based on CMC Net and admin settings
  getChequeBookOffer(cmcNet: number): Observable<ChequeBookOffer | null> {
    return this.getChequeBookSettings().pipe(
      map(settings => {
        // Find matching CMC range
        const range = settings.cmcNetRanges.find(r => 
          cmcNet >= r.minValue && cmcNet <= r.maxValue
        );
        
        if (!range) {
          return null; // No matching range found
        }
        
        return {
          cmcNet: cmcNet,
          sheetsCount: range.sheetsCount,
          limitPerSheet: range.limitPerSheet,
          totalLimit: range.totalLimit,
          validityPeriod: range.validityPeriod
        };
      })
    );
  }

  // Submit a derogation request
  // Get all derogation requests - for admin use
  getDerogationRequests(): Observable<DerogationRequest[]> {
    if (!this.isBrowser) {
      return of([]);
    }

    const derogationRequestsRef = collection(firestore, 'derogations');
    const derogationRequestsQuery = query(derogationRequestsRef);

    return from(getDocs(derogationRequestsQuery)).pipe(
      map(snapshot => {
        const requests: DerogationRequest[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as Omit<DerogationRequest, 'requestId'>;
          requests.push({
            requestId: doc.id,
            ...data
          });
        });
        return requests;
      }),
      catchError(error => {
        console.error('Error fetching derogation requests:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  // Update derogation request status - for admin use
  updateDerogationStatus(requestId: string, newStatus: 'pending' | 'approved' | 'rejected', adminComment?: string): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    const derogationRef = doc(firestore, 'derogationRequests', requestId);
    const updateData: any = { 
      status: newStatus,
      dateProcessed: new Date()
    };
    
    if (adminComment) {
      updateData.adminComment = adminComment;
    }

    return from(updateDoc(derogationRef, updateData)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating derogation status:', error);
        return of(false);
      })
    );
  }

  // Confirm and create a cheque book request
  confirmChequeBookRequest(accountNumber: string, customerName: string, offer: ChequeBookOffer): Observable<CheckRequest> {
    return this.createCheckRequest({
      accountNumber: accountNumber,
      customerName: customerName,
      checkCount: offer.sheetsCount
    });
  }

  // Get pending cheques from my_cheque collection
  getPendingCheques(): Observable<IssuedCheque[]> {
    if (!this.isBrowser) {
      return of([]);
    }

    const chequesRef = collection(firestore, 'my_cheque');
    const pendingChequesQuery = query(chequesRef);

    return from(getDocs(pendingChequesQuery)).pipe(
      map(snapshot => {
        const pendingCheques: IssuedCheque[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          
          // Check if the document has issuedCheques array
          if (data && data['issuedCheques'] && Array.isArray(data['issuedCheques'])) {
            // Filter for cheques with 'pending' status
            const pendingFromDoc = data['issuedCheques'].filter((cheque: any) => 
              cheque.status === 'pending'
            );
            
            // Map to our interface and add to results
            pendingFromDoc.forEach((cheque: any) => {
              pendingCheques.push({
                id: cheque.id || cheque.checkNumber,
                amount: cheque.amount,
                bank: cheque.bank,
                beneficier: cheque.beneficier,
                checkNumber: cheque.checkNumber,
                confirmed: cheque.confirmed,
                date: cheque.date,
                date_of_scan: cheque.date_of_scan,
                id_donateur: cheque.id_donateur,
                is_reserved: cheque.is_reserved || false,
                issuerBank: cheque.issuerBank,
                montant: cheque.montant,
                nom: cheque.nom,
                recipient: cheque.recipient,
                recipient_id: cheque.recipient_id,
                reservation_date: cheque.reservation_date,
                status: cheque.status
              });
            });
          }
        });
        return pendingCheques;
      }),
      catchError(error => {
        console.error('Error fetching pending cheques:', error);
        return of([]);
      })
    );
  }
  
  // Update cheque status to 'delivered' when given to client
  deliverChequeToClient(docId: string, chequeId: string): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }
    
    const chequeDocRef = doc(firestore, 'my_cheque', docId);
    
    // First, get the current document to update the specific cheque in the array
    return from(getDoc(chequeDocRef)).pipe(
      map(docSnap => {
        if (!docSnap.exists()) {
          throw new Error('Cheque document not found');
        }
        
        const data = docSnap.data();
        let updated = false;
        
        if (data && data['issuedCheques'] && Array.isArray(data['issuedCheques'])) {
          // Find and update the specific cheque
          const updatedIssuedCheques = data['issuedCheques'].map((cheque: any) => {
            if (cheque.id === chequeId || cheque.checkNumber === chequeId) {
              updated = true;
              return {
                ...cheque,
                status: 'delivered',
                deliveryDate: new Date()
              };
            }
            return cheque;
          });
          
          if (updated) {
            // Update the document with the modified array
            updateDoc(chequeDocRef, {
              issuedCheques: updatedIssuedCheques,
              updatedAt: new Date()
            });
            return true;
          }
        }
        
        throw new Error('Cheque not found in the document');
      }),
      catchError(error => {
        console.error('Error delivering cheque to client:', error);
        return of(false);
      })
    );
  }

  // Get check requests count from the 'cheque' collection
  getCheckRequestsCount(): Observable<number> {
    if (!this.isBrowser) {
      return of(0);
    }

    const chequeRef = collection(firestore, 'cheque');
    const chequeQuery = query(chequeRef);

    return from(getDocs(chequeQuery)).pipe(
      map(snapshot => snapshot.size),
      catchError(error => {
        console.error('Error counting check requests:', error);
        return of(0);
      })
    );
  }

  // Get derogation requests count from the 'derogations' collection
  getDerogationRequestsCount(): Observable<number> {
    if (!this.isBrowser) {
      return of(0);
    }

    const derogationsRef = collection(firestore, 'derogations');
    const derogationsQuery = query(derogationsRef);

    return from(getDocs(derogationsQuery)).pipe(
      map(snapshot => snapshot.size),
      catchError(error => {
        console.error('Error counting derogation requests:', error);
        return of(0);
      })
    );
  }

  // Fetch check requests from the 'cheque' collection
  getCheckRequestsFromCheque(): Observable<CheckRequest[]> {
    if (!this.isBrowser) {
      return of([]);
    }

    const chequeRef = collection(firestore, 'cheque');
    const chequeQuery = query(chequeRef);

    return from(getDocs(chequeQuery)).pipe(
      map(snapshot => {
        const requests: CheckRequest[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          // Map the data from cheque collection to CheckRequest format
          requests.push({
            id: doc.id,
            accountNumber: data['accountNumber'] || data['account'] || '',
            customerName: data['customerName'] || data['name'] || '',
            checkCount: data['checkCount'] || data['count'] || 0,
            requestDate: data['requestDate'] || data['date'] || new Date(),
            status: data['status'] || 'pending',
            reason: data['reason'] || ''
          });
        });
        return requests;
      }),
      catchError(error => {
        console.error('Error fetching cheque collection:', error);
        return of([]);
      })
    );
  }

  // New method to get a specific cheque request by ID
  getChequeRequestById(id: string): Observable<DemandeCheque | null> {
    if (!this.isBrowser) {
      return of(null);
    }

    const chequeRequestRef = doc(firestore, 'demande_cheque', id);
    return from(getDoc(chequeRequestRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data
          } as DemandeCheque;
        } else {
          console.error('Cheque request not found:', id);
          return null;
        }
      }),
      catchError(error => {
        console.error('Error fetching cheque request:', error);
        return of(null);
      })
    );
  }

  // New method to get all cheque requests from 'demande_cheque' collection
  getAllChequeRequests(): Observable<DemandeCheque[]> {
    if (!this.isBrowser) {
      return of([]);
    }

    const chequeRequestsRef = collection(firestore, 'demande_cheque');
    const chequeRequestsQuery = query(chequeRequestsRef);

    return from(getDocs(chequeRequestsQuery)).pipe(
      map(snapshot => {
        const requests: DemandeCheque[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          requests.push({
            id: doc.id,
            ...data
          } as DemandeCheque);
        });
        return requests;
      }),
      catchError(error => {
        console.error('Error fetching cheque requests:', error);
        return of([]);
      })
    );
  }

  // New method to update a cheque request status
  updateChequeRequestStatus(id: string, newStatus: string): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    const chequeRequestRef = doc(firestore, 'demande_cheque', id);
    return from(updateDoc(chequeRequestRef, { status: newStatus })).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating cheque request status:', error);
        return of(false);
      })
    );
  }
}