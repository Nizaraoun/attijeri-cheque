import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientService, Client } from '../../services/client.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-client-creation',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './client-creation.component.html',
  styleUrls: ['./client-creation.component.scss']
})
export class ClientCreationComponent implements OnInit {
  clientForm: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  hasSubmitted = false;
  
  // Options for dropdowns
  genderOptions = ['Homme', 'Femme'];
  clientTypeOptions = ['Particulier', 'Professionnel', 'Entreprise'];
  accountTypeOptions = ['Courant', 'Épargne', 'Professionnel'];
  
  constructor(
    private fb: FormBuilder,
    private clientService: ClientService
  ) {
    // Initialize the form with empty values
    this.clientForm = this.fb.group({
      Nom: ['', [Validators.required, Validators.minLength(2)]],
      Prénom: ['', [Validators.required, Validators.minLength(2)]],
      Date_naissance: ['', [Validators.required]],
      Sexe: ['Homme', [Validators.required]],
      Nationnalité: ['Tunisienne', [Validators.required]],
      num_identité: ['', [Validators.required, Validators.minLength(8)]],
      Télephone: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      email: ['', [Validators.required, Validators.email]],
      Type_Client: ['Particulier', [Validators.required]],
      type_compte: ['Courant', [Validators.required]],
      salaire: [0, [Validators.required, Validators.min(0)]],
      solde: ['0 TND', [Validators.required]],
      // The following fields will be generated automatically
      ID_Client: [''],
      ID_Compte: [''],
      RIB: [''],
      stat_compte: ['Actif']
    });
  }

  ngOnInit(): void {}
  
  // Format the solde value as currency
  formatSolde(): void {
    let currentSolde = this.clientForm.get('solde')?.value || '';
    if (typeof currentSolde === 'string') {
      currentSolde = currentSolde.replace(' TND', '').trim();
    }
    
    // Format the number and add TND
    const numericValue = parseFloat(currentSolde);
    if (!isNaN(numericValue)) {
      const formattedValue = numericValue.toFixed(3) + ' TND';
      this.clientForm.get('solde')?.setValue(formattedValue);
    }
  }
  
  // Submit the form
  submitForm(): void {
    this.hasSubmitted = true;
    this.clearMessages();
    
    if (this.clientForm.invalid) {
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
      return;
    }
    
    this.isLoading = true;
    
    // Check if email already exists
    this.clientService.checkEmailExists(this.clientForm.get('email')?.value).subscribe({
      next: (exists) => {
        if (exists) {
          this.errorMessage = 'Cette adresse email est déjà utilisée par un autre client.';
          this.isLoading = false;
          return;
        }
        
        // Generate the IDs and RIB
        this.generateIdsAndCreate();
      },
      error: (error) => {
        this.errorMessage = 'Une erreur est survenue lors de la vérification de l\'email. Veuillez réessayer.';
        this.isLoading = false;
        console.error('Error checking email:', error);
      }
    });
  }
  
  // Generate unique IDs and RIB, then create the client
  private generateIdsAndCreate(): void {
    // Use forkJoin to get all three values in parallel
    forkJoin({
      clientID: this.clientService.generateClientID(),
      accountID: this.clientService.generateAccountID(),
      rib: this.clientService.generateRIB()
    }).subscribe({
      next: (result) => {
        // Update form with generated values
        this.clientForm.patchValue({
          ID_Client: result.clientID,
          ID_Compte: result.accountID,
          RIB: result.rib
        });
        
        // Format the solde value
        this.formatSolde();
        
        // Create the client
        this.createClient();
      },
      error: (error) => {
        this.errorMessage = 'Une erreur est survenue lors de la génération des identifiants. Veuillez réessayer.';
        this.isLoading = false;
        console.error('Error generating IDs:', error);
      }
    });
  }
  
  // Create the client in Firestore
  private createClient(): void {
    const clientData: Client = this.clientForm.value;
    
    this.clientService.addClient(clientData).subscribe({
      next: (docId) => {
        this.isLoading = false;
        this.successMessage = 'Client créé avec succès.';
        this.resetForm();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Une erreur est survenue lors de la création du client. Veuillez réessayer.';
        console.error('Error creating client:', error);
      }
    });
  }
  
  // Clear success and error messages
  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
  
  // Reset the form after successful submission
  resetForm(): void {
    this.hasSubmitted = false;
    this.clientForm.reset({
      Sexe: 'Homme',
      Nationnalité: 'Tunisienne',
      Type_Client: 'Particulier',
      type_compte: 'Courant',
      salaire: 0,
      solde: '0 TND',
      stat_compte: 'Actif'
    });
  }
  
  // Convenience getter for form fields
  get f() { 
    return this.clientForm.controls; 
  }
}