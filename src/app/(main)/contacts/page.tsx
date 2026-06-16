"use client";

import { AppHeader } from '@/components/zynqo/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, deleteDoc, doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserMinus, MessageSquare, Search, UserPlus, Loader2, Users } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ContactsPage() {
  const { user } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Load contacts sub-collection
  const contactsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'users', user.uid, 'contacts'));
  }, [db, user?.uid]);

  const { data: contacts = [], loading: contactsLoading } = useCollection(contactsQuery);

  // Load all users to get real-time status/details for contacts
  const usersQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'users'));
  }, [db, user?.uid]);

  const { data: allUsers = [] } = useCollection(usersQuery);

  // Map contacts to their full user profiles
  const contactProfiles = useMemo(() => {
    const userMap = new Map(allUsers.map((u: any) => [u.uid, u]));
    return contacts
      .map((c: any) => userMap.get(c.id))
      .filter(Boolean)
      .filter((u: any) => 
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase())
      ) as any[];
  }, [contacts, allUsers, searchQuery]);

  const removeContact = async (contactId: string) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'contacts', contactId));
    } catch (err) {
      console.error("Error removing contact", err);
    }
  };

  return (
    <div className="flex flex-col animate-fade-in bg-[#0E0C12] min-h-screen pb-20">
      <AppHeader title="Contacts" showSearch={false} />
      
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search contacts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          {contactsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-primary/50" size={32} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading Contacts...</p>
            </div>
          ) : contactProfiles.length > 0 ? (
            contactProfiles.map((profile) => (
              <div 
                key={profile.uid}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all group"
              >
                <Link href={`/users/${profile.uid}`} className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border border-white/5">
                      <AvatarImage src={profile.profilePhoto} />
                      <AvatarFallback>{profile.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    {profile.onlineStatus === 'online' && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0E0C12]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{profile.displayName}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">@{profile.username}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-primary rounded-full hover:bg-primary/10"
                    onClick={() => router.push(`/chats`)} // Logic for starting chat
                  >
                    <MessageSquare size={18} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive rounded-full hover:bg-destructive/10"
                    onClick={() => removeContact(profile.uid)}
                  >
                    <UserMinus size={18} />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center px-8">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
                <Users size={32} className="text-muted-foreground opacity-20" />
              </div>
              <h4 className="font-bold text-lg mb-1">{searchQuery ? 'No results found' : 'No contacts yet'}</h4>
              <p className="text-xs text-muted-foreground">Find people to connect with in the Discover tab or search for friends.</p>
              <Button 
                onClick={() => router.push('/chats')} 
                variant="outline" 
                className="mt-6 rounded-2xl border-primary/20 text-primary"
              >
                Search Users
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}