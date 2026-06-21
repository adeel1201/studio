'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase services if not already initialized.
 */
export function initializeFirebase(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
} {
  // Safety check for required config
  const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined";
  
  if (!isConfigValid) {
    return { app: null, auth: null, db: null, storage: null };
  }

  try {
    const app = getApps().length === 0 
      ? initializeApp(firebaseConfig) 
      : getApp();
      
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    
    return { app, auth, db, storage };
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
    return { app: null, auth: null, db: null, storage: null };
  }
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-doc';
export * from './firestore/use-collection';
export * from './firestore/use-memo-firebase';
export * from './error-emitter';
export * from './errors';
