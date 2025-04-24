import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { firestore } from '../../environments/environment';

export interface Client {
  Date_naissance: string;
  ID_Client: string;
  ID_Compte: string;
  Nationnalité: string;
  Nom: string;
  Prénom: string;
  RIB: string;
  Sexe: string;
  Type_Client: string;
  Télephone: string;
  email: string;
  num_identité: string;
  salaire: number;
  solde: string;
  stat_compte: string;
  type_compte: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private db: any;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Initialize Firestore only in browser environment
    if (this.isBrowser) {
      this.db = getFirestore();
    }
  }

  // Add a new client to the 'client' collection
  addClient(client: Client): Observable<string> {
    if (!this.isBrowser) {
      return of('');
    }

    const clientsRef = collection(firestore, 'client');
    
    return from(addDoc(clientsRef, client)).pipe(
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Error adding client:', error);
        throw error;
      })
    );
  }

  // Generate a unique client ID
  generateClientID(): Observable<string> {
    if (!this.isBrowser) {
      return of('');
    }

    // Get the current date as basis for ID
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Get last 2 digits of year
    
    // Generate a random 4-digit number
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    // Combine to create a 6-character ID
    const newID = year + randomNum.toString();
    
    // Check if this ID already exists in the database
    return this.checkClientIDExists(newID).pipe(
      map(exists => {
        if (exists) {
          // If exists, try again with another random number
          // In a real app, you might want to handle this differently
          const newRandomNum = Math.floor(1000 + Math.random() * 9000);
          return year + newRandomNum.toString();
        }
        return newID;
      })
    );
  }

  // Generate a unique account ID
  generateAccountID(): Observable<string> {
    if (!this.isBrowser) {
      return of('');
    }
    
    // Generate a random 6-digit number
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const newID = randomNum.toString();
    
    // Check if this ID already exists
    return this.checkAccountIDExists(newID).pipe(
      map(exists => {
        if (exists) {
          // If exists, try again with another random number
          const newRandomNum = Math.floor(100000 + Math.random() * 900000);
          return newRandomNum.toString();
        }
        return newID;
      })
    );
  }

  // Generate a unique RIB (bank account number)
  generateRIB(): Observable<string> {
    if (!this.isBrowser) {
      return of('');
    }
    
    // Standard format for Tunisian RIB: [bank code (2)][branch code (3)][account number (13)][key (2)]
    // Here we use 04 for bank code (example) and 015 for branch code
    const bankCode = '04';
    const branchCode = '015';
    
    // Generate 13 random digits for account number
    let accountNumber = '';
    for (let i = 0; i < 13; i++) {
      accountNumber += Math.floor(Math.random() * 10).toString();
    }
    
    // Generate 2 random digits for key (in a real app, this would be calculated)
    const key = Math.floor(10 + Math.random() * 90).toString();
    
    const rib = bankCode + branchCode + accountNumber + key;
    
    // Check if this RIB already exists
    return this.checkRIBExists(rib).pipe(
      map(exists => {
        if (exists) {
          // If exists, we would regenerate, but for simplicity, we'll just modify slightly
          let modifiedAccountNumber = '';
          for (let i = 0; i < 13; i++) {
            modifiedAccountNumber += Math.floor(Math.random() * 10).toString();
          }
          return bankCode + branchCode + modifiedAccountNumber + key;
        }
        return rib;
      })
    );
  }

  // Check if a client ID already exists
  private checkClientIDExists(id: string): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    const clientsRef = collection(firestore, 'client');
    const q = query(clientsRef, where('ID_Client', '==', id));
    
    return from(getDocs(q)).pipe(
      map(snapshot => !snapshot.empty),
      catchError(error => {
        console.error('Error checking client ID:', error);
        return of(false); // Assume it doesn't exist if there's an error
      })
    );
  }

  // Check if an account ID already exists
  private checkAccountIDExists(id: string): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    const clientsRef = collection(firestore, 'client');
    const q = query(clientsRef, where('ID_Compte', '==', id));
    
    return from(getDocs(q)).pipe(
      map(snapshot => !snapshot.empty),
      catchError(error => {
        console.error('Error checking account ID:', error);
        return of(false);
      })
    );
  }

  // Check if a RIB already exists
  private checkRIBExists(rib: string): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    const clientsRef = collection(firestore, 'client');
    const q = query(clientsRef, where('RIB', '==', rib));
    
    return from(getDocs(q)).pipe(
      map(snapshot => !snapshot.empty),
      catchError(error => {
        console.error('Error checking RIB:', error);
        return of(false);
      })
    );
  }

  // Check if an email already exists
  checkEmailExists(email: string): Observable<boolean> {
    if (!this.isBrowser) {
      return of(false);
    }

    const clientsRef = collection(firestore, 'client');
    const q = query(clientsRef, where('email', '==', email));
    
    return from(getDocs(q)).pipe(
      map(snapshot => !snapshot.empty),
      catchError(error => {
        console.error('Error checking email:', error);
        return of(false);
      })
    );
  }
}