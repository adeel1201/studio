'use client';

import { useRef } from 'react';

/**
 * A hook to stabilize a Firestore reference or query.
 * It only returns a new object if the dependencies have changed.
 * This is critical for useCollection and useDoc to avoid infinite re-render loops.
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  const ref = useRef<T | null>(null);
  const depsRef = useRef<any[]>([]);

  const changed =
    deps.length !== depsRef.current.length || deps.some((dep, i) => dep !== depsRef.current[i]);

  if (changed || ref.current === null) {
    ref.current = factory();
    depsRef.current = deps;
  }

  return ref.current!;
}
