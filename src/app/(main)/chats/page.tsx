
"use client";

import { AppHeader } from '@/components/zynqo/AppHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { MessageSquare, Search, X, UserPlus, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  // Load real chats from Firestore where current user is a participant
  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
  }, [db, user?.uid]);

  const { data: chats = [], loading: chatsLoading } = useCollection(chatsQuery);

  // Load all users to search for starting a new chat
  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), orderBy('displayName', 'asc'));
  }, [db]);

  const { data: allUsers = [] } = useCollection(usersQuery);

  // Filter conversations for the main list based on search input
  const filteredChats = useMemo(() => {
    return chats.filter((chat: any) => {
      const partnerName = chat.participantNames?.find((n: string) => n !== user?.displayName) || '';
      const lastMsgText = chat.lastMessage?.text || '';
      return partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             lastMsgText.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [chats, searchQuery, user?.displayName]);

  // Filter users for the "New Chat" dialog search
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u: any) => {
      if (u.uid === user?.uid) return false;
      const search = userSearchQuery.toLowerCase();
      return u.username?.toLowerCase().includes(search) || 
             u.displayName?.toLowerCase().includes(search);
    });
  }, [allUsers, userSearchQuery, user?.uid]);

  const startNewChat = async (targetUser: any) => {
    if (!user || !db) return;

    // Check if a 1:1 chat already exists with this user
    const existingChat = chats.find((c: any) => 
      c.participantIds?.length === 2 && c.participantIds.includes(targetUser.uid)
    );

    if (existingChat) {
      router.push(`/chats/${existingChat.id}`);
      setIsNewChatOpen(false);
      return;
    }

    const newChatData = {
      participantIds: [user.uid, targetUser.uid],
      participantNames: [user.displayName || 'User', targetUser.displayName || 'User'],
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
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

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
            const timestamp = formatTimestamp(chat.updatedAt);
            const isUnread = chat.lastMessage?.senderId !== user?.uid && chat.lastMessage?.status !== 'read';

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
                  {isUnread && (
                    <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-primary rounded-full border-2 border-[#0E0C12] animate-pulse" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`font-bold text-sm truncate flex items-center gap-1 ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {partnerName}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest shrink-0">
                      {timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate leading-relaxed max-w-[85%] ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {chat.lastMessage?.senderId === user?.uid && <span className="text-primary/70 font-bold mr-1 text-[10px]">YOU:</span>}
                      {lastMsg}
                    </p>
                    {isUnread && (
                      <Badge className="bg-primary text-[10px] h-4 px-1.5 min-w-[1rem] flex items-center justify-center rounded-full">
                        NEW
                      </Badge>
                    )}
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
            {!searchQuery && (
              <Button 
                onClick={() => setIsNewChatOpen(true)}
                variant="outline" 
                className="mt-6 rounded-2xl border-primary/20 text-primary hover:bg-primary/5"
              >
                Start Chatting
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button with New Chat Dialog */}
      {!isSearching && (
        <Dialog open={isNewChatOpen} onOpenChange={(open) => {
          setIsNewChatOpen(open);
          if (!open) setUserSearchQuery('');
        }}>
          <DialogTrigger asChild>
            <Button 
              className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 z-30 transition-transform active:scale-90"
              size="icon"
            >
              <UserPlus size={24} />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 text-foreground rounded-[2rem] max-w-[90vw] sm:max-w-[400px] p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="font-headline text-xl font-bold text-center sm:text-left">New Conversation</DialogTitle>
            </DialogHeader>
            
            <div className="px-6 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input 
                  placeholder="Search by username..." 
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="h-10 pl-10 bg-white/5 border-white/5 rounded-xl text-xs focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto no-scrollbar px-2 pb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-4 mb-2 opacity-50">
                {userSearchQuery ? 'Search Results' : 'Suggested Users'}
              </p>
              
              <div className="space-y-1">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u: any) => (
                    <button 
                      key={u.uid}
                      onClick={() => startNewChat(u)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left px-4 group"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 border border-white/5">
                          <AvatarImage src={u.profilePhoto} />
                          <AvatarFallback className="bg-primary/10 text-primary">{u.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm group-hover:text-primary transition-colors truncate">{u.displayName}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase truncate">@{u.username}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center text-primary transition-all">
                        <Sparkles size={14} className="opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                      <Search size={20} className="text-muted-foreground opacity-20" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {userSearchQuery ? `No users found matching "${userSearchQuery}"` : 'Try searching for a friend'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
