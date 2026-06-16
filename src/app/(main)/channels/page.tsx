
"use client";

import { useState, useMemo } from 'react';
import { AppHeader } from '@/components/zynqo/AppHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Radio, Users, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';

export default function ChannelsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all public channels
  const channelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'channels'),
      where('type', '==', 'public'),
      orderBy('createdAt', 'desc')
    );
  }, [db]);

  const { data: channels = [], loading } = useCollection(channelsQuery);

  const filteredChannels = useMemo(() => {
    return channels.filter((c: any) => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  // Channels I follow
  const followedChannels = useMemo(() => {
    return channels.filter((c: any) => c.followerIds?.includes(user?.uid));
  }, [channels, user?.uid]);

  return (
    <div className="flex flex-col animate-fade-in bg-[#0E0C12] min-h-screen pb-24">
      <AppHeader title="Channels" showSearch={false} />

      <div className="p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search channels..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary text-sm"
          />
        </div>

        {/* My Subscriptions */}
        {followedChannels.length > 0 && !searchQuery && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Following</h4>
            <div className="flex flex-col gap-2">
              {followedChannels.map((channel: any) => (
                <ChannelCard key={channel.id} channel={channel} onClick={() => router.push(`/channels/${channel.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Discover Channels */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-2">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Discover</h4>
            <Sparkles size={14} className="text-primary animate-pulse" />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="animate-spin text-primary" size={24} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Loading Directory...</p>
            </div>
          ) : filteredChannels.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filteredChannels.map((channel: any) => (
                <ChannelCard key={channel.id} channel={channel} onClick={() => router.push(`/channels/${channel.id}`)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-card/10 rounded-[2.5rem] border border-dashed border-white/5">
              <Radio className="text-muted-foreground opacity-20 mb-4" size={32} />
              <p className="text-xs text-muted-foreground font-medium">No channels found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create FAB */}
      <Button 
        onClick={() => router.push('/channels/create')}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 z-30 transition-transform active:scale-90"
        size="icon"
      >
        <Plus size={24} />
      </Button>
    </div>
  );
}

function ChannelCard({ channel, onClick }: { channel: any; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-4 bg-card/30 p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-all cursor-pointer group"
    >
      <Avatar className="w-12 h-12 border border-white/10 rounded-xl">
        <AvatarImage src={channel.photo} />
        <AvatarFallback className="bg-primary/10 text-primary">
          <Radio size={20} />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h5 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{channel.name}</h5>
        <p className="text-[10px] text-muted-foreground truncate font-medium mt-0.5">{channel.description || 'No description'}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-wider">
            <Users size={10} />
            <span>{channel.followerIds?.length || 0} Followers</span>
          </div>
          {channel.type === 'private' && (
             <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-muted-foreground uppercase font-black">Private</span>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
    </div>
  );
}
