"use client";

/**
 * @fileOverview Zynqo Real-time Firebase Hooks
 * Provides a unified, stable, and real-time interface for all Firebase operations.
 */

import { 
  useFirestore as useBaseFirestore, 
  useStorage as useBaseStorage, 
  useFirebaseAuth as useBaseAuth,
  useCollection as useBaseCollection,
  useDoc as useBaseDoc,
  useMemoFirebase
} from '@/firebase';
import { DocumentData, Query, DocumentReference } from 'firebase/firestore';

/**
 * Returns the Firestore instance.
 */
export function useFirestore() {
  return useBaseFirestore();
}

/**
 * Returns the Storage instance.
 */
export function useStorage() {
  return useBaseStorage();
}

/**
 * Returns the Auth instance.
 */
export function useFirebaseAuth() {
  return useBaseAuth();
}

/**
 * Real-time collection hook using onSnapshot.
 * Automatically handles subscriptions and cleanups.
 */
export function useCollection<T = DocumentData>(q: Query<T> | null) {
  return useBaseCollection<T>(q);
}

/**
 * Real-time document hook using onSnapshot.
 * Automatically handles subscriptions and cleanups.
 */
export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  return useBaseDoc<T>(ref);
}

/**
 * Stabilizes a Firebase query or reference to prevent infinite render loops.
 */
export { useMemoFirebase };
