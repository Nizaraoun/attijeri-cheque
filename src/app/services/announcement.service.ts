import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { firestore } from '../../environments/environment';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  Timestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { map } from 'rxjs/operators';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  colorHex: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private announcementsSubject = new BehaviorSubject<Announcement[]>([]);
  private collectionRef = collection(firestore, 'announcements');
  private unsubscribe: (() => void) | null = null;

  constructor() {
    // Initialize real-time listener for announcements
    this.initializeListener();
  }

  private initializeListener(): void {
    // Create a query to get announcements sorted by creation date (newest first)
    const q = query(this.collectionRef, orderBy('createdAt', 'desc'));
    
    // Set up real-time listener
    this.unsubscribe = onSnapshot(q, (querySnapshot) => {
      const announcements: Announcement[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        announcements.push({
          id: doc.id,
          title: data['title'],
          description: data['description'],
          colorHex: data['colorHex'],
          createdAt: data['createdAt'].toDate()
        });
      });
      this.announcementsSubject.next(announcements);
    }, (error) => {
      console.error('Error listening to announcements:', error);
    });
  }

  getAnnouncements(): Observable<Announcement[]> {
    return this.announcementsSubject.asObservable();
  }

  addAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt'>): Observable<Announcement> {
    const newAnnouncement = {
      ...announcement,
      createdAt: Timestamp.now()
    };
    
    return from(addDoc(this.collectionRef, newAnnouncement)).pipe(
      map(docRef => {
        return {
          id: docRef.id,
          ...announcement,
          createdAt: new Date()
        };
      })
    );
  }

  deleteAnnouncement(id: string): Observable<boolean> {
    const docRef = doc(firestore, 'announcements', id);
    return from(deleteDoc(docRef)).pipe(
      map(() => true)
    );
  }

  // Clean up the subscription when the service is destroyed
  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}