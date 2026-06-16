"use client";

import { AppHeader } from '@/components/zynqo/AppHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { MessageSquare, Search, X, UserPlus, Loader2, Sparkles, Users, BookUser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

export default function ChatsPage() {
  const { user } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid)
    );
  }, [db, user?.uid]);

  const { data: chats = [], loading: chatsLoading } = useCollection(chatsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'users'));
  }, [db, user?.uid]);

  const { data: allUsers = [] } = useCollection(usersQuery);

  const userStatusMap = useMemo(() => {
    const map: Record<string, any> = {};
    allUsers.forEach((u: any) => {
      map[u.uid] = u;
    });
    return map;
  }, [allUsers]);

  const filteredChats = useMemo(() => {
    const sorted = [...chats].sort((a: any, b: any) => {
      const timeA = a.updatedAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    return sorted.filter((chat: any) => {
      const partnerName = chat.type === 'group' 
        ? chat.groupName 
        : chat.participantNames?.find((n: string) => n !== user?.displayName) || '';
      
      const lastMsgText = chat.lastMessage?.text || '';
      return partnerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             lastMsgText.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [chats, searchQuery, user?.displayName]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u: any) => {
      if (u.uid === user?.uid) return false;
      const search = userSearchQuery.toLowerCase();
      return u.username?.toLowerCase().includes(search) || 
             u.displayName?.toLowerCase().includes(search);
    });
  }, [allUsers, userSearchQuery, user?.uid]);

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
      <header className="sticky top-0 z-40 w-full glass-morphism safe-top px-4 h-[72px] flex items-center justify-between">
        <h1 className="text-2xl font-headline font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Zynqo
        </h1>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/contacts')}
            className="text-primary hover:bg-primary/10 rounded-full"
          >
            <BookUser size={22} />
          </Button>
          {!isSearching && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSearching(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Search size={22} />
            </Button>
          )}
        </div>
      </header>
      
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

      <div className="flex flex-col divide-y divide-white/5">
        {chatsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary/50" size={32} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Syncing Messages...</p>
          </div>
        ) : filteredChats.length > 0 ? (
          filteredChats.map((chat: any) => {
            const isGroup = chat.type === 'group';
            const partnerId = !isGroup ? chat.participantIds?.find((id: string) => id !== user?.uid) : null;
            const partnerProfile = partnerId ? userStatusMap[partnerId] : null;
            
            const chatName = isGroup 
              ? chat.groupName 
              : partnerProfile?.displayName || chat.participantNames?.find((n: string) => n !== user?.displayName) || 'Partner';
            
            const chatPhoto = isGroup 
              ? chat.groupPhoto 
              : partnerProfile?.profilePhoto || `https://picsum.photos/seed/${chat.id}/100/100`;

            const lastMsg = chat.lastMessage?.text || 'No messages yet';
            const timestamp = formatTimestamp(chat.updatedAt);
            const isUnread = chat.lastMessage?.senderId !== user?.uid && chat.lastMessage?.status !== 'read';
            const isOnline = !isGroup && partnerProfile?.onlineStatus === 'online';

            return (
              <Link 
                key={chat.id} 
                href={`/chats/${chat.id}`}
                className="flex items-center gap-4 p-4 hover:bg-white/5 transition-all active:bg-white/10 group"
              >
                <div className="relative">
                  <Avatar className="w-14 h-14 border border-white/5 shadow-xl">
                    <AvatarImage src={chatPhoto} />
                    <AvatarFallback className={isGroup ? "bg-primary/20 text-primary" : ""}>
                      {isGroup ? <Users size={24} /> : chatName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0E0C12]" />
                  )}
                  {isUnread && (
                    <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-primary rounded-full border-2 border-[#0E0C12] animate-pulse" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`font-bold text-sm truncate flex items-center gap-1 ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {isGroup && <Users size={12} className="text-primary shrink-0" />}
                      {chatName}
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
            <p className="text-xs text-muted-foreground">Start a new chat with your friends or create a group.</p>
            {!searchQuery && (
              <div className="flex gap-2 mt-6">
                <Button 
                  onClick={() => setIsNewChatOpen(true)}
                  variant="outline" 
                  className="rounded-2xl border-primary/20 text-primary hover:bg-primary/5"
                >
                  Start Chatting
                </Button>
                <Button 
                  onClick={() => router.push('/chats/create-group')}
                  variant="ghost" 
                  className="rounded-2xl text-muted-foreground hover:text-foreground"
                >
                  New Group
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

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
              <div className="flex items-center justify-between">
                <DialogTitle className="font-headline text-xl font-bold text-center sm:text-left">New Chat</DialogTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setIsNewChatOpen(false); router.push('/chats/create-group'); }}
                  className="rounded-xl border-primary/20 text-primary h-8 px-3 text-[10px] font-bold uppercase tracking-wider"
                >
                  <Users size={14} className="mr-1.5" />
                  New Group
                </Button>
              </div>
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
                    <Link 
                      key={u.uid}
                      href={`/users/${u.uid}`}
                      onClick={() => setIsNewChatOpen(false)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left px-4 group"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 border border-white/5">
                          <AvatarImage src={u.profilePhoto} />
                          <AvatarFallback className="bg-primary/10 text-primary">{u.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-card rounded-full ${u.onlineStatus === 'online' ? 'bg-green-500' : 'bg-muted'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm group-hover:text-primary transition-colors truncate">{u.displayName}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase truncate">@{u.username}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center text-primary transition-all">
                        <Sparkles size={14} className="opacity-0 group-hover:opacity-100" />
                      </div>
                    </Link>
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