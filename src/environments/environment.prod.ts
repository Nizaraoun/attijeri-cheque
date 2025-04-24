
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: "AIzaSyDBjQ53XCn2CZl-DVMcRUCsKm2Y738dPGg",
  authDomain: "cheque-2ff3e.firebaseapp.com",
  projectId: "cheque-2ff3e",
  storageBucket: "cheque-2ff3e.firebasestorage.app",
  messagingSenderId: "1013867037574",
  appId: "1:1013867037574:web:96dcbafee38d8a05d3e207",
  measurementId: "G-1JP5JZ33V7"
  },
};

export const app = initializeApp(environment.firebaseConfig);
export const firestore = getFirestore(app);
export const auth = getAuth(app);
