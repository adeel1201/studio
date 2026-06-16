'use client';

import { useState, useEffect } from 'react';
import { Query, onSnapshot, DocumentData, CollectionReference } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { useAuth } from '../provider';

/**
 * Custom hook to subscribe to a Firestore collection query.
 * @param q The Firestore Query object or null.
 * @returns An object containing the collection data and loading state.
 */
export function useCollection<T = DocumentData>(q: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();

  useEffect(() => {
    // Attempt to extract the path for debugging, handling both Ref and Query objects
    let path = 'unknown_query';
    let collectionName = 'unknown_collection';
    try {
      // @ts-ignore - access internal path/segments if available
      path = (q as any).path || (q as any)._query?.path?.segments?.join('/') || 'unknown_query';
      collectionName = path.split('/').pop() || 'unknown_collection';
    } catch (e) {}

    // Debugging logs as requested
    console.log(`[Firestore Query] Initiating useCollection subscription:`, {
      collectionName,
      path,
      currentUserUid: auth?.currentUser?.uid || 'NONE',
      authCurrentUserExists: !!auth?.currentUser
    });

    // Guard: Ensure we have a query and that the Auth SDK is actually ready with a user
    // to prevent the race condition where Firestore sends an unauthenticated request.
    if (!q || !auth?.currentUser) {
      if (!q) {
        console.log(`[Firestore Query] Aborting useCollection: No query provided.`);
        setLoading(false);
      } else {
        console.log(`[Firestore Query] Waiting for Auth SDK synchronization...`);
      }
      return;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`[Firestore Query] Success: Received ${snapshot.docs.length} docs from ${path}`);
        const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
        setData(results);
        setLoading(false);
      },
      async (serverError) => {
        console.error(`[Firestore Query] FAILED: ${serverError.message}`, {
          path,
          operation: 'list',
          uid: auth?.currentUser?.uid
        });

        const permissionError = new FirestorePermissionError({
          path: path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [q, auth?.currentUser?.uid]); // Re-run when query or auth state changes

  return { data, loading };
}
