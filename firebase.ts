import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// Configuration provided by the user
const defaultFirebaseConfig = {
  apiKey: "AIzaSyAbDB8Upzp9Xg9jHJCmeVSwmKZ1UAw_8HA",
  authDomain: "messchat-c135c.firebaseapp.com",
  databaseURL: "https://messchat-c135c-default-rtdb.firebaseio.com",
  projectId: "messchat-c135c",
  storageBucket: "messchat-c135c.firebasestorage.app",
  messagingSenderId: "1081871657810",
  appId: "1:1081871657810:web:acf3e1673b122a442a288b",
  measurementId: "G-F8H1M3VLBQ"
};

// Check for saved config in localStorage to allow runtime updates
// If no local config is found, use the hardcoded default
const savedConfig = typeof window !== 'undefined' ? localStorage.getItem('flux_firebase_config') : null;
const firebaseConfig = savedConfig ? JSON.parse(savedConfig) : defaultFirebaseConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Analytics is initialized but not currently exported for use, avoiding unused variable warnings if strictly linted
if (typeof window !== 'undefined') {
  getAnalytics(app);
}
