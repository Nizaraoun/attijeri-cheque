import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnnouncementService, Announcement } from '../../services/announcement.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-announcement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcement.component.html',
  styleUrl: './announcement.component.scss'
})
export class AnnouncementComponent implements OnInit, OnDestroy {
  announcements: Announcement[] = [];
  isLoading = true;
  private subscription: Subscription | null = null;
  
  // New announcement form data
  newAnnouncement = {
    title: '',
    description: '',
    colorHex: '#4CAF50' // Default color
  };
  
  // Form state
  showNewAnnouncementForm = false;
  isSubmitting = false;
  formError = '';
  
  // Available colors for announcements
  colorOptions = [
    { name: 'Green', value: '#4CAF50' },
    { name: 'Blue', value: '#2196F3' },
    { name: 'Yellow', value: '#FFC107' },
    { name: 'Red', value: '#F44336' },
    { name: 'Purple', value: '#9C27B0' }
  ];

  constructor(private announcementService: AnnouncementService) {}

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadAnnouncements(): void {
    this.isLoading = true;
    this.subscription = this.announcementService.getAnnouncements().subscribe({
      next: (data) => {
        this.announcements = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading announcements:', error);
        this.isLoading = false;
      }
    });
  }

  toggleNewAnnouncementForm(): void {
    this.showNewAnnouncementForm = !this.showNewAnnouncementForm;
    if (this.showNewAnnouncementForm) {
      // Reset form when opening
      this.resetNewAnnouncementForm();
    }
  }

  resetNewAnnouncementForm(): void {
    this.newAnnouncement = {
      title: '',
      description: '',
      colorHex: '#4CAF50'
    };
    this.formError = '';
  }

  createAnnouncement(): void {
    if (!this.newAnnouncement.title.trim() || !this.newAnnouncement.description.trim()) {
      this.formError = 'Please fill in all required fields';
      return;
    }
    
    this.isSubmitting = true;
    this.formError = '';
    
    this.announcementService.addAnnouncement(this.newAnnouncement).subscribe({
      next: () => {
        // Form is reset and closed after successful submission
        this.resetNewAnnouncementForm();
        this.showNewAnnouncementForm = false;
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error creating announcement:', error);
        this.formError = 'Failed to create announcement. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  deleteAnnouncement(id: string): void {
    if (confirm('Are you sure you want to delete this announcement?')) {
      this.announcementService.deleteAnnouncement(id).subscribe({
        next: (success) => {
          if (!success) {
            console.error('Failed to delete announcement');
          }
        },
        error: (error) => {
          console.error('Error deleting announcement:', error);
          alert('Failed to delete announcement. Please try again.');
        }
      });
    }
  }
}
