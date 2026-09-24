import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase Configuration provided by user
 * Project: velopay-a1ec6
 */
export const firebaseConfig = {
  apiKey: "AIzaSyCXCeJ-MvkPJPR6a7F38zCs8VVZA8-udU4",
  authDomain: "velopay-a1ec6.firebaseapp.com",
  projectId: "velopay-a1ec6",
  storageBucket: "velopay-a1ec6.firebasestorage.app",
  messagingSenderId: "923271873933",
  appId: "1:923271873933:web:103f31fa5e2149551129c4"
};

// Check if valid Firebase configuration is provided
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Initialize Firebase App safely
export const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(firebaseConfig);

// Export Auth and Firestore services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
};
