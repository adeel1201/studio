
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, where } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowLeft, TrendingUp, ShieldCheck, Loader2, Play, Lock, Globe } from 'lucide-react';

export default function VChannelsDiscoveryPage() {
  const router = useRouter();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');

  // Discoverability: WeChat Style - Exclude "hidden" channels from trending/search
  const creatorsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'creatorChannels'), 
      where('privacy', 'in', ['public', 'private']), // Hidden channels excluded
      limit(20)
    );
  }, [db]);

  const { data: creators = [], loading } = useCollection(creatorsQuery);

  const filteredCreators = useMemo(() => {
    return creators.filter((c: any) => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [creators, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] text-white animate-fade-in pb-10">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl safe-top px-4 h-16 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white rounded-full">
          <ArrowLeft size={24} />
        </Button>
        <div className="relative flex-1">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
           <Input 
             autoFocus
             placeholder="Search creators..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="h-10 pl-10 bg-white/5 border-white/5 rounded-xl text-sm focus-visible:ring-primary"
           />
        </div>
      </header>

      <div className="p-4 space-y-8">
         <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            {['Following', 'Recommended', 'Live', 'Music', 'Tech', 'Food', 'Travel'].map(cat => (
              <Button key={cat} variant="outline" size="sm" className="rounded-full border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest px-6 h-9 hover:bg-primary/10 hover:text-primary">
                {cat}
              </Button>
            ))}
         </div>

         <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                 <TrendingUp size={14} className="text-primary" />
                 {searchQuery ? 'Search Results' : 'Trending Creators'}
               </h3>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                 <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : filteredCreators.length > 0 ? (
              <div className="flex flex-col gap-3">
                 {filteredCreators.map((creator: any) => (
                   <div 
                     key={creator.id} 
                     onClick={() => router.push(`/v-channels/${creator.id}`)}
                     className="flex items-center justify-between bg-card/40 p-4 rounded-3xl border border-white/5 hover:bg-white/5 transition-all cursor-pointer group"
                   >
                      <div className="flex items-center gap-4">
                         <Avatar className="h-12 w-12 rounded-2xl border border-primary/20">
                            <AvatarImage src={creator.avatar} />
                            <AvatarFallback>{creator.name?.[0]}</AvatarFallback>
                         </Avatar>
                         <div>
                            <h4 className="font-bold text-sm flex items-center gap-1.5">
                               {creator.name}
                               {creator.isVerified && <ShieldCheck size={14} className="text-primary" />}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                               <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">@{creator.username}</p>
                               <span className="text-[8px] text-primary/40 font-black flex items-center gap-0.5">
                                  {creator.privacy === 'private' ? <Lock size={8} /> : <Globe size={8} />}
                                  {creator.privacy || 'public'}
                               </span>
                            </div>
                         </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/10 px-4">
                         Visit
                      </Button>
                   </div>
                 ))}
              </div>
            ) : (
              <div className="py-20 text-center text-muted-foreground bg-card/20 rounded-[2.5rem] border border-dashed border-white/5">
                 <p className="text-xs italic">No creators found matching "{searchQuery}"</p>
              </div>
            )}
         </section>
      </div>
    </div>
  );
}
