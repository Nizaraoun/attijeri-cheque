import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { 
  CheckService, 
  EligibilitySettings,
  ChequeBookSettings,
  CmcNetRange,
  DerogationRequest
} from '../../services/check.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit {
    maxSafeInteger: number = Number.MAX_SAFE_INTEGER;

  // Active tab
  activeTab: 'eligibility' | 'checkbook' | 'derogations' = 'eligibility';
  
  // Settings
  eligibilitySettings: EligibilitySettings | null = null;
  chequeBookSettings: ChequeBookSettings | null = null;
  
  // UI state
  isLoading = {
    eligibility: false,
    checkbook: false,
    saveEligibility: false,
    saveCheckbook: false,
    derogations: false
  };
  
  // Messages
  successMessage = '';
  errorMessage = '';
  
  // New range form
  newRange: CmcNetRange = {
    minValue: 0,
    maxValue: 0,
    sheetsCount: 0,
    limitPerSheet: 0,
    totalLimit: 0,
    validityPeriod: 12
  };
  
  // Derogation requests for admin review
  derogationRequests: DerogationRequest[] = [];
  selectedDerogation: DerogationRequest | null = null;
  derogationStatusComment = '';
  
  constructor(private checkService: CheckService) { }

  ngOnInit(): void {
    this.loadEligibilitySettings();
    this.loadChequeBookSettings();
    this.loadDerogationRequests();
  }
  
  // Tab management
  setActiveTab(tab: 'eligibility' | 'checkbook' | 'derogations'): void {
    this.activeTab = tab;
    this.clearMessages();
    
    if (tab === 'eligibility' && !this.eligibilitySettings) {
      this.loadEligibilitySettings();
    } else if (tab === 'checkbook' && !this.chequeBookSettings) {
      this.loadChequeBookSettings();
    } else if (tab === 'derogations') {
      this.loadDerogationRequests();
    }
  }
  
  // Load eligibility settings
  loadEligibilitySettings(): void {
    this.isLoading.eligibility = true;
    this.clearMessages();
    
    this.checkService.getEligibilitySettings().subscribe({
      next: (settings) => {
        this.eligibilitySettings = settings;
        this.isLoading.eligibility = false;
      },
      error: (error) => {
        console.error('Error loading eligibility settings:', error);
        this.errorMessage = 'Error loading eligibility settings. Please try again.';
        this.isLoading.eligibility = false;
      }
    });
  }
  
  // Load checkbook settings
  loadChequeBookSettings(): void {
    this.isLoading.checkbook = true;
    this.clearMessages();
    
    this.checkService.getChequeBookSettings().subscribe({
      next: (settings) => {
        this.chequeBookSettings = settings;
        this.isLoading.checkbook = false;
      },
      error: (error) => {
        console.error('Error loading checkbook settings:', error);
        this.errorMessage = 'Error loading checkbook settings. Please try again.';
        this.isLoading.checkbook = false;
      }
    });
  }
  
  // Load derogation requests
  loadDerogationRequests(): void {
    this.isLoading.derogations = true;
    this.clearMessages();
    
    this.checkService.getDerogationRequests().subscribe({
      next: (requests) => {
        this.derogationRequests = requests;
        this.isLoading.derogations = false;
      },
      error: (error) => {
        console.error('Error loading derogation requests:', error);
        this.errorMessage = 'Error loading derogation requests. Please try again.';
        this.isLoading.derogations = false;
      }
    });
  }
  
  // Save eligibility settings
  saveEligibilitySettings(): void {
    if (!this.eligibilitySettings) return;
    
    this.isLoading.saveEligibility = true;
    this.clearMessages();
    
    this.checkService.saveEligibilitySettings(this.eligibilitySettings).subscribe({
      next: (success) => {
        if (success) {
          this.successMessage = 'Eligibility settings saved successfully.';
        } else {
          this.errorMessage = 'Error saving eligibility settings.';
        }
        this.isLoading.saveEligibility = false;
      },
      error: (error) => {
        console.error('Error saving eligibility settings:', error);
        this.errorMessage = 'Error saving eligibility settings. Please try again.';
        this.isLoading.saveEligibility = false;
      }
    });
  }
  
  // Save checkbook settings
  saveChequeBookSettings(): void {
    if (!this.chequeBookSettings) return;
    
    this.isLoading.saveCheckbook = true;
    this.clearMessages();
    
    this.checkService.saveChequeBookSettings(this.chequeBookSettings).subscribe({
      next: (success) => {
        if (success) {
          this.successMessage = 'Checkbook settings saved successfully.';
        } else {
          this.errorMessage = 'Error saving checkbook settings.';
        }
        this.isLoading.saveCheckbook = false;
      },
      error: (error) => {
        console.error('Error saving checkbook settings:', error);
        this.errorMessage = 'Error saving checkbook settings. Please try again.';
        this.isLoading.saveCheckbook = false;
      }
    });
  }
  
  // Add a new CMC Net range
  addCmcNetRange(): void {
    if (!this.chequeBookSettings) return;
    
    // Calculate total limit if not provided
    if (!this.newRange.totalLimit && this.newRange.sheetsCount && this.newRange.limitPerSheet) {
      this.newRange.totalLimit = this.newRange.sheetsCount * this.newRange.limitPerSheet;
    }
    
    // Validate new range
    if (
      this.newRange.minValue <= 0 ||
      this.newRange.maxValue <= 0 ||
      this.newRange.minValue >= this.newRange.maxValue ||
      this.newRange.sheetsCount <= 0 ||
      this.newRange.limitPerSheet <= 0 ||
      this.newRange.validityPeriod <= 0
    ) {
      this.errorMessage = 'Please enter valid values for the new range.';
      return;
    }
    
    // Check for overlap with existing ranges
    const hasOverlap = this.chequeBookSettings.cmcNetRanges.some(range => 
      (this.newRange.minValue <= range.maxValue && this.newRange.maxValue >= range.minValue)
    );
    
    if (hasOverlap) {
      this.errorMessage = 'The new range overlaps with an existing range.';
      return;
    }
    
    // Add new range and sort ranges by minValue
    this.chequeBookSettings.cmcNetRanges.push({...this.newRange});
    this.chequeBookSettings.cmcNetRanges.sort((a, b) => a.minValue - b.minValue);
    
    // Reset form
    this.newRange = {
      minValue: 0,
      maxValue: 0,
      sheetsCount: 0,
      limitPerSheet: 0,
      totalLimit: 0,
      validityPeriod: 12
    };
    
    // Save changes
    this.saveChequeBookSettings();
  }
  
  // Remove a CMC Net range
  removeCmcNetRange(index: number): void {
    if (!this.chequeBookSettings) return;
    
    this.chequeBookSettings.cmcNetRanges.splice(index, 1);
    this.saveChequeBookSettings();
  }
  
  // Handle derogation request
  viewDerogation(derogation: DerogationRequest): void {
    this.selectedDerogation = derogation;
    this.derogationStatusComment = '';
  }
  
  // Process derogation request
  processDerogation(status: 'approved' | 'rejected'): void {
    if (!this.selectedDerogation) return;
    
    this.isLoading.derogations = true;
    this.clearMessages();
    
    this.checkService.updateDerogationStatus(
      this.selectedDerogation.requestId,
      status,
      this.derogationStatusComment
    ).subscribe({
      next: (success) => {
        if (success) {
          this.successMessage = `Derogation request ${status}.`;
          // Update local state
          if (this.selectedDerogation) {
            this.selectedDerogation.status = status;
          }
          // Reload derogations after processing
          this.loadDerogationRequests();
        } else {
          this.errorMessage = `Error ${status} derogation request.`;
        }
        this.isLoading.derogations = false;
      },
      error: (error) => {
        console.error(`Error ${status} derogation request:`, error);
        this.errorMessage = `Error ${status} derogation request. Please try again.`;
        this.isLoading.derogations = false;
      }
    });
  }
  
  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
  
  // Format date for display
  formatDate(date: Date | any): string {
    if (!date) return '';
    if (typeof date === 'object' && date.seconds) {
      // Handle Firestore Timestamp
      return new Date(date.seconds * 1000).toLocaleDateString('fr-TN');
    }
    return new Date(date).toLocaleDateString('fr-TN');
  }
}