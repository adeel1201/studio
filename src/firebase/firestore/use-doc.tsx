'use client';

import { useState, useEffect } from 'react';
import { DocumentReference, onSnapshot, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { useAuth } from '../provider';

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();

  useEffect(() => {
    const path = ref?.path || 'unknown_doc';
    const collectionName = path.split('/')[0] || 'unknown_collection';

    // Debugging logs as requested
    console.log(`[Firestore Query] Initiating useDoc subscription:`, {
      collectionName,
      path,
      currentUserUid: auth?.currentUser?.uid || 'NONE',
      authCurrentUserExists: !!auth?.currentUser
    });

    // Guard: Ensure we have a ref and the Auth SDK has initialized the currentUser
    if (!ref || !auth?.currentUser) {
      if (!ref) {
        console.log(`[Firestore Query] Aborting useDoc: No reference provided.`);
        setLoading(false);
      } else {
        console.log(`[Firestore Query] Waiting for Auth SDK synchronization for ${path}...`);
      }
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (doc) => {
        console.log(`[Firestore Query] Success: Received doc from ${path}`);
        setData(doc.exists() ? { id: doc.id, ...doc.data() } as any : null);
        setLoading(false);
      },
      async (error) => {
        console.error(`[Firestore Query] FAILED: ${error.message}`, {
          path,
          operation: 'get',
          uid: auth?.currentUser?.uid
        });

        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [ref?.path, auth?.currentUser?.uid]);

  return { data, loading };
}
