"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
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
  
  // Use direct firebase instance hooks
  const firebaseAuth = useAuth();
  const db = useFirestore();
  
  const router = useRouter();
  const pathname = usePathname();

  // Handle Online Status
  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.uid);
    
    updateDoc(userRef, {
      onlineStatus: 'online',
      lastSeen: serverTimestamp()
    }).catch(() => {});

    const handleVisibilityChange = () => {
      const status = document.visibilityState === 'visible' ? 'online' : 'away';
      updateDoc(userRef, { 
        onlineStatus: status,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, db]);

  // Subscribe to Auth and Profile
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    if (!firebaseAuth || !db) {
      console.warn("AuthProvider: Firebase instances missing.");
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (authUser) => {
      setUser(authUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (authUser && db) {
        const docRef = doc(db, "users", authUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Profile snapshot error:", err);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [firebaseAuth, db]);

  // Handle Protected Routes
  useEffect(() => {
    if (!loading && firebaseAuth) {
      const publicPaths = ['/welcome', '/login', '/signup', '/forgot-password'];
      const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));

      if (!user && !isPublicPath) {
        router.push('/welcome');
      } else if (user && isPublicPath) {
        router.push('/chats');
      }
    }
  }, [user, loading, pathname, router, firebaseAuth]);

  if (!firebaseAuth || !db) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Firebase Connection Required</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          The app couldn't connect to Firebase. Please verify your environment variables.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Zynqo...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
