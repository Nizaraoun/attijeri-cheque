import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { delay, tap, map, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../environments/environment';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private router: Router, 
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Initialize auth state only in browser environment
    if (this.isBrowser) {
      this.isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
      this.isLoggedIn$ = this.isLoggedInSubject.asObservable();
      this.checkUserSession();
    }
  }

  private checkUserSession(): void {
    if (!this.isBrowser) return;
    
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      this.currentUserSubject.next(user);
      this.isLoggedInSubject.next(true);
    }
  }

  private hasToken(): boolean {
    if (!this.isBrowser) return false;
    return !!localStorage.getItem('token') || !!localStorage.getItem('isLoggedIn');
  }

  login(email: string, password: string): Observable<any> {
    return from(this.checkAdminCredentials(email, password)).pipe(
      map(adminUser => {
        if (!adminUser) {
          throw new Error('Invalid email or password');
        }
        
        const response = {
          success: true,
          user: {
            id: adminUser.id,
            email: adminUser.email,
            fullName: adminUser.fullName || 'Admin User',
            role: 'admin'
          },
          token: 'firebase-auth-token'
        };
        
        if (this.isBrowser) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          this.isLoggedInSubject.next(true);
        }
        
        return response;
      }),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  // Check credentials against admin collection in Firestore
  private async checkAdminCredentials(email: string, password: string): Promise<any> {
    try {
      const adminRef = collection(firestore, 'Back_office');
      const q = query(adminRef, where('email', '==', email), where('mdp', '==', password));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Get the first matching admin
      const adminDoc = querySnapshot.docs[0];
      return {
        id: adminDoc.id,
        ...adminDoc.data()
      };
    } catch (error) {
      console.error('Error checking admin credentials:', error);
      return null;
    }
  }

  // Get the total count of accounts from the authentication collection
  getTotalAccountsCount(): Observable<number> {
    if (!this.isBrowser) {
      return of(0);
    }

    const accountsRef = collection(firestore, 'client');
    const accountsQuery = query(accountsRef);

    return from(getDocs(accountsQuery)).pipe(
      map(snapshot => snapshot.size),
      catchError(error => {
        console.error('Error counting accounts:', error);
        return of(0);
      })
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
    }
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
    
    // Navigate to login with full page refresh
    this.router.navigate(['/auth/login']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  // Guard method to protect routes
  canAccess(): boolean {
    const isLoggedIn = this.isLoggedIn();
    if (!isLoggedIn) {
      this.router.navigate(['/auth/login']);
    }
    return isLoggedIn;
  }
}