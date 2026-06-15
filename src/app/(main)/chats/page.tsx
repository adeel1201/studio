
"use client";

import { AppHeader } from '@/components/zynqo/AppHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { MessageSquare, Search, X, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function ChatsPage() {
  const { user } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  // Load real chats from Firestore
  const chatsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
  }, [db, user]);

  const { data: chats = [], loading: chatsLoading } = useCollection(chatsQuery);

  // Load all users to start new chats (Simplified for MVP)
  const usersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'users'), orderBy('displayName', 'asc'));
  }, [db]);

  const { data: allUsers = [] } = useCollection(usersQuery);

  const filteredChats = chats.filter((chat: any) => {
    const partnerName = chat.participantNames?.find((n: string) => n !== user?.displayName) || '';
    const lastMsgText = chat.lastMessage?.text || '';
    return partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           lastMsgText.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const startNewChat = async (targetUser: any) => {
    if (!user || !db) return;

    // Check if chat already exists
    const existingChat = chats.find((c: any) => c.participantIds.includes(targetUser.uid));
    if (existingChat) {
      router.push(`/chats/${existingChat.id}`);
      setIsNewChatOpen(false);
      return;
    }

    const newChatData = {
      participantIds: [user.uid, targetUser.uid],
      participantNames: [user.displayName, targetUser.displayName],
      updatedAt: serverTimestamp(),
      lastMessage: {
        text: 'Started a new conversation',
        senderId: user.uid,
        timestamp: serverTimestamp()
      }
    };

    const chatsRef = collection(db, 'chats');
    addDoc(chatsRef, newChatData)
      .then((docRef) => {
        router.push(`/chats/${docRef.id}`);
        setIsNewChatOpen(false);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: chatsRef.path,
          operation: 'create',
          requestResourceData: newChatData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="flex flex-col animate-fade-in pb-20 min-h-screen bg-[#0E0C12]">
      <AppHeader 
        title="Zynqo" 
        showSearch={!isSearching}
        showActions={!isSearching}
        onSearchClick={() => setIsSearching(true)}
      />
      
      {/* Search Bar Overlay */}
      {isSearching && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md px-4 py-3 flex items-center gap-2 border-b border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              autoFocus
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10 pr-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary text-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <Button 
            variant="ghost" 
            onClick={() => { setIsSearching(false); setSearchQuery(''); }} 
            className="text-xs font-bold uppercase tracking-widest text-primary px-2"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Chat List */}
      <div className="flex flex-col divide-y divide-white/5">
        {chatsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary/50" size={32} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Syncing Messages...</p>
          </div>
        ) : filteredChats.length > 0 ? (
          filteredChats.map((chat: any) => {
            const partnerName = chat.participantNames?.find((n: string) => n !== user?.displayName) || 'Partner';
            const lastMsg = chat.lastMessage?.text || 'No messages yet';
            const timestamp = chat.updatedAt?.toDate ? chat.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <Link 
                key={chat.id} 
                href={`/chats/${chat.id}`}
                className="flex items-center gap-4 p-4 hover:bg-white/5 transition-all active:bg-white/10 group"
              >
                <div className="relative">
                  <Avatar className="w-14 h-14 border border-white/5 shadow-xl">
                    <AvatarImage src={`https://picsum.photos/seed/${chat.id}/100/100`} />
                    <AvatarFallback>{partnerName[0]}</AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-bold text-sm text-foreground truncate flex items-center gap-1">
                      {partnerName}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      {timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate leading-relaxed max-w-[85%]">
                      {chat.lastMessage?.senderId === user?.uid && <span className="text-primary/70 font-bold mr-1">YOU:</span>}
                      {lastMsg}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-muted-foreground opacity-20" />
            </div>
            <h4 className="font-bold text-lg mb-1">{searchQuery ? 'No results found' : 'No conversations yet'}</h4>
            <p className="text-xs text-muted-foreground">Start a new chat with your friends to see them here.</p>
          </div>
        )}
      </div>

      {/* Floating Action Button with New Chat Dialog */}
      {!isSearching && (
        <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
          <DialogTrigger asChild>
            <Button 
              className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 z-30 transition-transform active:scale-90"
              size="icon"
            >
              <UserPlus size={24} />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 text-foreground rounded-[2rem] max-w-[90vw] sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl font-bold">New Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4 max-h-[60vh] overflow-y-auto no-scrollbar">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2 mb-2">Available Users</p>
              {allUsers.filter((u: any) => u.uid !== user?.uid).map((u: any) => (
                <button 
                  key={u.uid}
                  onClick={() => startNewChat(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.profilePhoto} />
                    <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-sm">{u.displayName}</h4>
                    <p className="text-[10px] text-primary font-medium tracking-widest uppercase">@{u.username}</p>
                  </div>
                </button>
              ))}
              {allUsers.length <= 1 && (
                <p className="text-center text-xs text-muted-foreground py-8">No other users found yet.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
