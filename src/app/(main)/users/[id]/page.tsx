"use client";

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  UserPlus, 
  UserMinus, 
  MessageSquare, 
  MapPin, 
  Calendar,
  Loader2,
  Globe,
  MoreVertical,
  ShieldCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function UserProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isContact, setIsContact] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const userRef = useMemoFirebase(() => (id && typeof id === 'string') ? doc(db, 'users', id) : null, [db, id]);
  const { data: targetProfile, loading: profileLoading } = useDoc(userRef);

  const contactRef = useMemoFirebase(() => (user && id) ? doc(db, 'users', user.uid, 'contacts', id as string) : null, [db, user?.uid, id]);
  const { data: contactData } = useDoc(contactRef);

  useEffect(() => {
    setIsContact(!!contactData);
  }, [contactData]);

  const toggleContact = async () => {
    if (!user || !id || !db || !targetProfile) return;
    setIsActionLoading(true);
    try {
      const ref = doc(db, 'users', user.uid, 'contacts', id as string);
      if (isContact) {
        await deleteDoc(ref);
        toast({ title: "Removed from contacts" });
      } else {
        await setDoc(ref, {
          addedAt: serverTimestamp(),
          displayName: targetProfile.displayName,
          username: targetProfile.username
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
    if (!user || !id || !db || !targetProfile) return;
    setIsActionLoading(true);
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, 
        where('type', '==', 'one-to-one'),
        where('participantIds', 'array-contains', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const existingChat = querySnapshot.docs.find(d => d.data().participantIds.includes(id));

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`);
      } else {
        const newChat = await addDoc(chatsRef, {
          type: 'one-to-one',
          participantIds: [user.uid, id],
          participantNames: [user.displayName || 'User', targetProfile.displayName || 'User'],
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0E0C12]">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (!targetProfile) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0E0C12] text-center p-6">
      <p className="text-muted-foreground mb-4">User profile not found.</p>
      <Button onClick={() => router.back()} variant="outline" className="rounded-2xl">Go Back</Button>
    </div>
  );

  const isMe = user?.uid === id;
  const isOnline = targetProfile.onlineStatus === 'online';

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] animate-fade-in pb-10">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl safe-top px-2 h-16 flex items-center justify-between border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="font-bold text-lg">Profile</h2>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <MoreVertical size={20} />
        </Button>
      </header>

      <div className="relative h-64 bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-end justify-center pb-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-background shadow-2xl">
              <AvatarImage src={targetProfile.profilePhoto} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {targetProfile.displayName?.[0]}
              </AvatarFallback>
            </Avatar>
            {isOnline && <div className="absolute bottom-2 right-2 w-7 h-7 bg-green-500 border-4 border-[#0E0C12] rounded-full shadow-lg" />}
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-headline font-bold flex items-center justify-center gap-1.5">
              {targetProfile.displayName}
              {targetProfile.verified && <ShieldCheck size={18} className="text-primary" />}
            </h3>
            <span className="text-xs text-primary font-bold tracking-widest uppercase">@{targetProfile.username}</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="flex gap-3">
          {!isMe && (
            <>
              <Button onClick={startChat} disabled={isActionLoading} className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 font-bold">
                <MessageSquare size={18} className="mr-2" /> Message
              </Button>
              <Button 
                variant="outline" onClick={toggleContact} disabled={isActionLoading}
                className={`flex-1 h-12 rounded-2xl border-white/10 ${isContact ? 'text-destructive hover:bg-destructive/10' : 'text-primary hover:bg-primary/10'}`}
              >
                {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : (
                  isContact ? <><UserMinus size={18} className="mr-2" /> Remove</> : <><UserPlus size={18} className="mr-2" /> Add Contact</>
                )}
              </Button>
            </>
          )}
          {isMe && <Button onClick={() => router.push('/profile/edit')} className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold">Edit My Profile</Button>}
        </div>

        <div className="bg-card/30 rounded-[2rem] p-6 border border-white/5 space-y-4">
          {targetProfile.bio && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">About</h4>
              <p className="text-sm text-muted-foreground leading-relaxed italic">"{targetProfile.bio}"</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe size={16} className="text-primary/60" />
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-bold opacity-50">Location</span>
                <span className="text-xs font-semibold">{targetProfile.country || 'Not specified'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={16} className="text-primary/60" />
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-bold opacity-50">Joined</span>
                <span className="text-xs font-semibold">{targetProfile.createdAt ? new Date(targetProfile.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}