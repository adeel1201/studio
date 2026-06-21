"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.uid);
    updateDoc(userRef, {
      onlineStatus: 'online',
      lastSeen: serverTimestamp()
    }).catch(() => {});

    const handleVisibility = () => {
      const status = document.visibilityState === 'visible' ? 'online' : 'away';
      updateDoc(userRef, { onlineStatus: status, lastSeen: serverTimestamp() }).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, db]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (unsubscribeProfile) unsubscribeProfile();

      if (authUser) {
        const docRef = doc(db, "users", authUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          setProfile(docSnap.exists() ? docSnap.data() : null);
          setLoading(false);
        }, () => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [auth, db]);

  // Handle Protected Routes
  useEffect(() => {
    if (!loading && auth) {
      const publicPaths = ['/welcome', '/login', '/signup', '/forgot-password'];
      const isPublic = publicPaths.some(path => pathname?.startsWith(path));

      if (!user && !isPublic) {
        router.push('/welcome');
      } else if (user && isPublic) {
        router.push('/chats');
      }
    }
  }, [user, loading, pathname, router, auth]);

  if (!auth || !db) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2 text-foreground">Firebase Error</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Initialization failed. Please ensure all environment variables are correctly set.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Connecting to Zynqo...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
