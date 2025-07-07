// client/src/firebase-client.ts

// Imports for Firebase App initialization
import { initializeApp, getApps, getApp } from 'firebase/app'; // Removed FirebaseApp from here
import type { FirebaseApp } from 'firebase/app'; // CORRECTED: Import FirebaseApp as a type only

// Imports for Firebase Auth service and types
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import type { User as FirebaseUserType } from 'firebase/auth';

// Imports for Firebase Firestore service and types
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';


// Manually provided firebaseConfig (as Canvas globals are not reliably injected)
// MAKE SURE THIS MATCHES THE firebaseConfig YOU PASTED INTO CommentSection.tsx

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// ADD THIS CONSOLE LOG
console.log('Firebase Client Config being used:', firebaseConfig);
console.log('API Key length:', firebaseConfig.apiKey ? firebaseConfig.apiKey.length : 'N/A');
// END ADDITION

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (!getApps().length) {
  try {
    appInstance = initializeApp(firebaseConfig);
    console.log('✅ Firebase client app initialized successfully in firebase-client.ts!');
  } catch (e: any) {
    console.error('❌ Failed to initialize Firebase app in firebase-client.ts:', e);
    appInstance = null;
  }
} else {
  appInstance = getApp();
  console.log('⚠️ Firebase client app already initialized. Re-using existing instance.');
}

if (appInstance) {
  authInstance = getAuth(appInstance);
  dbInstance = getFirestore(appInstance);
} else {
  authInstance = null;
  dbInstance = null;
}

export { authInstance as auth, dbInstance as db };
export type FirebaseUser = FirebaseUserType;
