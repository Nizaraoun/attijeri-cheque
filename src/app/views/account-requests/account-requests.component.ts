import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AccountService, AccountRequest } from '../../services/account.service';
import { getFirestore, collection, getDocs, doc, updateDoc, Timestamp, setDoc, getDoc, query, where } from 'firebase/firestore';
import { firestore } from '../../../environments/environment';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

interface DemandeCompte {
  id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  rib: string;
  dateCreation: string;
  statutDemande: 'En attente' | 'Approuvé' | 'Refusé' | 'En cours';
  motifRefus?: string;
}

@Component({
  selector: 'app-account-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './account-requests.component.html',
  styleUrls: ['./account-requests.component.scss']
})
export class AccountRequestsComponent implements OnInit {
  accountRequests: DemandeCompte[] = [];
  isLoading = true;
  selectedRequest: DemandeCompte | null = null;
  filterStatus: string = 'all';
  searchQuery: string = '';
  password: string = '';
  processingRequest = false;
  successMessage = '';
  errorMessage = '';

  constructor(private accountService: AccountService) { }
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Text copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy text to clipboard:', err);
    });}
  ngOnInit(): void {
    this.loadAccountRequests();
  }

  loadAccountRequests(): void {
    this.isLoading = true;
    this.fetchDemandesFromFirebase()
      .then(demandes => {
        this.accountRequests = demandes;
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Error loading account requests:', error);
        this.errorMessage = 'Erreur lors du chargement des demandes';
        this.isLoading = false;
      });
  }

  // Fetch demands from Firebase "demande" collection
  async fetchDemandesFromFirebase(): Promise<DemandeCompte[]> {
    try {
      const demandesRef = collection(firestore, 'demande');
      const snapshot = await getDocs(demandesRef);
      
      const demandes: DemandeCompte[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as Omit<DemandeCompte, 'id'>;
        demandes.push({
          id: doc.id,
          ...data
        });
      });
      
      return demandes;
    } catch (error) {
      console.error('Error fetching demandes from Firebase:', error);
      throw error;
    }
  }

  // Fetch client data by matching email
  async fetchClientData(email: string): Promise<any | null> {
    try {
      const clientsRef = collection(firestore, 'client');
      const q = query(clientsRef, where("email", "==", email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No client found with matching email:', email);
        return null;
      }
      
      // Return the first matching client
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };
    } catch (error) {
      console.error('Error fetching client data:', error);
      return null;
    }
  }

  // Generate random password
  generatePassword(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }
    
    return password;
  }

  // Create user account in Firebase Authentication
  async createUserAccount(email: string, password: string): Promise<string> {
    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendPasswordResetEmail(auth, email);
      
      return userCredential.user.uid;
    } catch (error) {
      console.error('Error creating user account:', error);
      throw error;
    }
  }

  // Save user account data to Firestore
  async saveUserAccountData(uid: string, accountData: DemandeCompte): Promise<boolean> {
    try {
      const userAccountRef = doc(firestore, 'user_account', uid);
      
      // Initialize base user data
      const userData: any = {
        nom: accountData.nom,
        prenom: accountData.prenom,
        email: accountData.email,
        telephone: accountData.telephone,
        rib: accountData.rib,
        dateCreation: new Date().toISOString(),
        statutCompte: 'Actif'
      };
      
      // Fetch additional client data if available
      const clientData = await this.fetchClientData(accountData.email);
      
      // If client data exists, merge with user account data
      if (clientData) {
        // Add all client fields except those already in userData
        if (clientData.Sexe) userData.sexe = clientData.Sexe;
        if (clientData.salaire) userData.salaire = clientData.salaire;
        if (clientData.solde) userData.solde = clientData.solde;
        if (clientData.Date_naissance) userData.dateNaissance = clientData.Date_naissance;
        if (clientData.Nationnalité) userData.nationalite = clientData.Nationnalité;
        if (clientData.Type_Client) userData.typeClient = clientData.Type_Client;
        if (clientData.num_identité) userData.numIdentite = clientData.num_identité;
        if (clientData.type_compte) userData.typeCompte = clientData.type_compte;
        
        console.log('Client data merged with user account:', userData);
      } else {
        console.log('No client data found for this email. Using only account request data.');
      }
      
      await setDoc(userAccountRef, userData);
      return true;
    } catch (error) {
      console.error('Error saving user account data:', error);
      throw error;
    }
  }

  // Update account request status in Firestore
  async updateRequestStatus(requestId: string, newStatus: 'En attente' | 'Approuvé' | 'Refusé' | 'En cours', motifRefus?: string): Promise<boolean> {
    try {
      const requestRef = doc(firestore, 'demande', requestId);
      
      const updateData: { statutDemande: string; motifRefus?: string } = {
        statutDemande: newStatus
      };
      
      if (motifRefus) {
        updateData.motifRefus = motifRefus;
      }
      
      await updateDoc(requestRef, updateData);
      
      return true;
    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  }

  // Process the account creation request
  async processRequest(request: DemandeCompte, approve: boolean, motifRefus?: string): Promise<void> {
    if (!request.id) return;
    
    this.processingRequest = true;
    this.successMessage = '';
    this.errorMessage = '';
    
    try {
      if (approve) {
        // Generate password
        const password = this.generatePassword();
        this.password = password;
        
        // Create user account and get the UID
        const uid = await this.createUserAccount(request.email, password);
        
        // Save user account data to user_account collection using the UID
        await this.saveUserAccountData(uid, request);
        
        // Update request status
        await this.updateRequestStatus(request.id, 'Approuvé');
        
        // Update local data
        const index = this.accountRequests.findIndex(r => r.id === request.id);
        if (index !== -1) {
          this.accountRequests[index].statutDemande = 'Approuvé';
          if (this.selectedRequest && this.selectedRequest.id === request.id) {
            this.selectedRequest = { ...this.accountRequests[index] };
          }
        }
        
        this.successMessage = `Compte créé avec succès. Un mot de passe temporaire a été généré: ${password}`;
      } else {
        // Update request status to rejected
        await this.updateRequestStatus(request.id, 'Refusé', motifRefus);
        
        // Update local data
        const index = this.accountRequests.findIndex(r => r.id === request.id);
        if (index !== -1) {
          this.accountRequests[index].statutDemande = 'Refusé';
          this.accountRequests[index].motifRefus = motifRefus;
          if (this.selectedRequest && this.selectedRequest.id === request.id) {
            this.selectedRequest = { ...this.accountRequests[index] };
          }
        }
        
        this.successMessage = 'Demande de compte refusée';
      }
    } catch (error) {
      console.error('Error processing request:', error);
      this.errorMessage = 'Erreur lors du traitement de la demande';
    } finally {
      this.processingRequest = false;
    }
  }

  viewRequestDetails(request: DemandeCompte): void {
    this.selectedRequest = request;
    this.password = '';
    this.successMessage = '';
    this.errorMessage = '';
  }

  closeDetails(): void {
    this.selectedRequest = null;
    this.password = '';
    this.successMessage = '';
    this.errorMessage = '';
  }

  getStatusClass(status: string): string {
    if (!status) return '';
    
    switch (status.toLowerCase()) {
      case 'approuvé': return 'status-success';
      case 'en attente': return 'status-warning';
      case 'en cours': return 'status-info';
      case 'refusé': return 'status-danger';
      default: return '';
    }
  }

  get filteredRequests(): DemandeCompte[] {
    let result = this.accountRequests;
    
    // Apply status filter
    if (this.filterStatus !== 'all') {
      result = result.filter(request => 
        request.statutDemande.toLowerCase() === this.filterStatus.toLowerCase()
      );
    }
    
    // Apply search query
    if (this.searchQuery?.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      result = result.filter(request => 
        request.nom.toLowerCase().includes(query) || 
        request.prenom.toLowerCase().includes(query) || 
        request.email.toLowerCase().includes(query) ||
        request.rib.includes(query) ||
        request.telephone.includes(query)
      );
    }
    
    return result;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-TN', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getFullName(request: DemandeCompte): string {
    return `${request.prenom} ${request.nom}`;
  }
}