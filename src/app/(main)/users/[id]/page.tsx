"use client";

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useDoc, useMemoFirebase } from '@/hooks/use-firebase';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  UserPlus, 
  UserMinus, 
  MessageSquare, 
  Calendar,
  Loader2,
  Globe,
  MoreVertical,
  ShieldCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function UserProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const { user, profile: myProfile } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isContact, setIsContact] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const userRef = useMemoFirebase(() => (id && db) ? doc(db, 'users', id) : null, [db, id]);
  const { data: targetProfile, loading: profileLoading } = useDoc(userRef);

  const contactRef = useMemoFirebase(() => (user?.uid && id && db) ? doc(db, 'users', user.uid, 'contacts', id) : null, [db, user?.uid, id]);
  const { data: contactData } = useDoc(contactRef);

  useEffect(() => {
    setIsContact(!!contactData);
  }, [contactData]);

  const toggleContact = async () => {
    // TypeScript Error Fix: Explicit null checks
    if (!user?.uid || !db || !id || !targetProfile) return;
    
    setIsActionLoading(true);
    try {
      const contactDocRef = doc(db!, 'users', user.uid, 'contacts', id);
      if (isContact) {
        await deleteDoc(contactDocRef);
        toast({ title: "Removed from contacts" });
      } else {
        await setDoc(contactDocRef, {
          addedAt: serverTimestamp(),
          displayName: (targetProfile as any).displayName || 'User',
          username: (targetProfile as any).username || 'unknown'
        });
        toast({ title: "Added to contacts" });
      }
    } catch (err) {
      toast({ title: "Operation failed", variant: "destructive" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const startChat = async () => {
    // TypeScript Error Fix: Explicit null checks
    if (!user?.uid || !db || !id || !targetProfile) {
      toast({ title: "Error", description: "Session or profile not found", variant: "destructive" });
      return;
    }
    
    setIsActionLoading(true);
    try {
      const chatsRef = collection(db!, 'chats');
      const q = query(
        chatsRef,
        where('type', '==', 'one-to-one'),
        where('participantIds', 'array-contains', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const existingChat = querySnapshot.docs.find(docSnap => {
        const data = docSnap.data();
        return data.participantIds && data.participantIds.includes(id);
      });

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`);
      } else {
        const newChat = await addDoc(chatsRef, {
          type: 'one-to-one',
          participantIds: [user.uid, id],
          participantNames: [user.displayName || myProfile?.displayName || 'User', (targetProfile as any).displayName || 'User'],
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          lastMessage: {
            text: 'Started a new conversation',
            senderId: user.uid,
            timestamp: serverTimestamp(),
            status: 'sent'
          }
        });
        router.push(`/chats/${newChat.id}`);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to start chat", variant: "destructive" });
    } finally {
      setIsActionLoading(false);
    }
  };

  if (profileLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (!targetProfile) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-6">
      <p className="text-muted-foreground mb-4">User profile not found.</p>
      <Button onClick={() => router.back()} variant="outline" className="rounded-2xl">Go Back</Button>
    </div>
  );

  const profileData = targetProfile as any;
  const isMe = user?.uid === id;
  const isOnline = profileData.onlineStatus === 'online';

  return (
    <div className="flex flex-col min-h-screen bg-background animate-fade-in pb-10">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl safe-top px-2 h-16 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground">
            <ChevronLeft size={24} />
          </Button>
          <h2 className="font-bold text-lg text-foreground">Profile</h2>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <MoreVertical size={20} />
        </Button>
      </header>

      <div className="relative h-64 bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-end justify-center pb-8 border-b border-border">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
              <AvatarImage src={profileData.profilePhoto} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {profileData.displayName?.[0]}
              </AvatarFallback>
            </Avatar>
            {isOnline && <div className="absolute bottom-2 right-2 w-7 h-7 bg-green-500 border-4 border-white rounded-full shadow-lg" />}
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-headline font-bold flex items-center justify-center gap-1.5 text-foreground">
              {profileData.displayName}
              {profileData.verified && <ShieldCheck size={18} className="text-primary" />}
            </h3>
            <span className="text-xs text-primary font-bold tracking-widest uppercase">@{profileData.username}</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="flex gap-3">
          {!isMe && (
            <>
              <Button onClick={startChat} disabled={isActionLoading} className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-white">
                <MessageSquare size={18} className="mr-2" /> Message
              </Button>
              <Button 
                variant="outline" onClick={toggleContact} disabled={isActionLoading}
                className={`flex-1 h-12 rounded-2xl border-border bg-white ${isContact ? 'text-destructive hover:bg-destructive/5' : 'text-primary hover:bg-primary/5'}`}
              >
                {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : (
                  isContact ? <><UserMinus size={18} className="mr-2" /> Remove</> : <><UserPlus size={18} className="mr-2" /> Add Contact</>
                )}
              </Button>
            </>
          )}
          {isMe && <Button onClick={() => router.push('/profile/edit')} className="w-full h-12 rounded-2xl bg-muted border border-border hover:bg-muted/80 font-bold text-foreground">Edit My Profile</Button>}
        </div>

        <div className="bg-card rounded-[2rem] p-6 border border-border space-y-4 shadow-sm">
          {profileData.bio && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">About</h4>
              <p className="text-sm text-muted-foreground leading-relaxed italic">"{profileData.bio}"</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe size={16} className="text-primary/60" />
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-bold opacity-50">Location</span>
                <span className="text-xs font-semibold text-foreground">{profileData.country || 'Not specified'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={16} className="text-primary/60" />
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-bold opacity-50">Joined</span>
                <span className="text-xs font-semibold text-foreground">{profileData.createdAt && typeof profileData.createdAt.seconds === 'number' ? new Date(profileData.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
