"use client";

import { AppHeader } from '@/components/zynqo/AppHeader';
import { MOCK_CHATS, MOCK_STORIES } from '@/app/lib/zynqo-mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, MessageSquare, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function ChatsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const filteredChats = MOCK_CHATS.filter(chat => 
    chat.participants[0].displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col animate-fade-in pb-20">
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

      {/* Stories Row (Hidden during search) */}
      {!isSearching && (
        <div className="p-4 border-b border-white/5 overflow-x-auto no-scrollbar bg-background/50">
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center p-1 group cursor-pointer hover:border-primary transition-colors">
                  <Avatar className="w-full h-full">
                    <AvatarImage src="https://picsum.photos/seed/me/100/100" />
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-0.5 border-2 border-background shadow-lg">
                    <Plus size={14} />
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">My Story</span>
            </div>
            
            {MOCK_STORIES.map((story) => (
              <div key={story.id} className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer">
                <div className={`p-0.5 rounded-full border-2 transition-all duration-300 ${story.hasSeen ? 'border-muted' : 'border-primary shadow-[0_0_10px_rgba(159,95,245,0.3)]'}`}>
                  <div className="p-0.5 rounded-full bg-background">
                    <Avatar className="w-14 h-14 group-hover:scale-105 transition-transform">
                      <AvatarImage src={story.user.avatar} />
                      <AvatarFallback>{story.user.displayName[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium truncate w-16 text-center uppercase tracking-tighter mt-1">
                  {story.user.displayName.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat List */}
      <div className="flex flex-col divide-y divide-white/5">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <Link 
              key={chat.id} 
              href={`/chats/${chat.id}`}
              className="flex items-center gap-4 p-4 hover:bg-white/5 transition-all active:bg-white/10 group"
            >
              <div className="relative">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary/20 to-transparent group-hover:from-primary/40 transition-colors">
                  <Avatar className="w-14 h-14 border border-white/5 shadow-xl">
                    <AvatarImage src={chat.participants[0].avatar} />
                    <AvatarFallback>{chat.participants[0].displayName[0]}</AvatarFallback>
                  </Avatar>
                </div>
                {chat.participants[0].status === 'online' && (
                  <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full shadow-lg" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-sm text-foreground truncate flex items-center gap-1">
                    {chat.participants[0].displayName}
                    {chat.participants[0].verified && <Badge variant="secondary" className="px-1 h-3 text-[8px] bg-primary/20 text-primary border-none">VERIFIED</Badge>}
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {chat.lastMessage.timestamp}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground truncate leading-relaxed max-w-[85%]">
                    {chat.lastMessage.senderId === 'me' && <span className="text-primary/70 font-bold mr-1">YOU:</span>}
                    {chat.lastMessage.text}
                  </p>
                  {chat.unreadCount > 0 && (
                    <div className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
              <Search size={32} className="text-muted-foreground opacity-20" />
            </div>
            <h4 className="font-bold text-lg mb-1">No chats found</h4>
            <p className="text-xs text-muted-foreground">Try searching for a different name or message content.</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {!isSearching && (
        <Button 
          className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 z-30 transition-transform active:scale-90"
          size="icon"
        >
          <MessageSquare size={24} />
        </Button>
      )}
    </div>
  );
}