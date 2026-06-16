"use client";

import { AppHeader } from '@/components/zynqo/AppHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

export default function CallsPage() {
  const { user } = useAuth();
  const db = useFirestore();

  // Load actual call history from Firestore
  const callsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'calls'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [db, user?.uid]);

  const { data: calls = [], loading } = useCollection(callsQuery);

  return (
    <div className="flex flex-col animate-fade-in bg-[#0E0C12] min-h-screen pb-24">
      <AppHeader title="Calls" showSearch={false} />
      
      <div className="p-4 flex flex-col gap-6">
        {/* Create Link */}
        <div className="flex items-center gap-4 bg-primary/10 p-5 rounded-[2.5rem] border border-primary/20 shadow-xl shadow-primary/5">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
            <Video size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">Create Call Link</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-60">Share a link for your Zynqo call</p>
          </div>
        </div>

        {/* Call History */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Recent Calls</h4>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="animate-spin text-primary" size={24} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Syncing History...</p>
            </div>
          ) : calls.length > 0 ? (
            <div className="flex flex-col divide-y divide-white/5 bg-card/30 rounded-[2.5rem] border border-white/5 overflow-hidden">
              {calls.map((call: any) => {
                const isCaller = call.callerId === user?.uid;
                const partnerName = isCaller ? call.receiverName : call.callerName;
                const partnerPhoto = isCaller ? call.receiverPhoto : call.callerPhoto;
                const date = call.createdAt?.toDate ? call.createdAt.toDate() : new Date();

                return (
                  <div key={call.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                    <Avatar className="w-12 h-12 border border-white/5">
                      <AvatarImage src={partnerPhoto} />
                      <AvatarFallback>{partnerName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-sm truncate">{partnerName}</h5>
                      <div className="flex items-center gap-1.5 mt-1">
                        {call.status === 'missed' ? (
                          <PhoneMissed size={12} className="text-destructive" />
                        ) : isCaller ? (
                          <PhoneOutgoing size={12} className="text-primary" />
                        ) : (
                          <PhoneIncoming size={12} className="text-green-500" />
                        )}
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                          {formatDistanceToNow(date, { addSuffix: true })}
                        </span>
                        {call.duration > 0 && (
                          <span className="text-[9px] text-muted-foreground/50 ml-1">• {Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="text-primary h-10 w-10 hover:bg-primary/10 rounded-full">
                        {call.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-card/10 rounded-[2.5rem] border border-dashed border-white/5">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Phone className="text-muted-foreground opacity-20" size={32} />
              </div>
              <p className="text-xs text-muted-foreground font-medium">No call history found.</p>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <Button 
        className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 z-30 transition-transform active:scale-90"
        size="icon"
      >
        <Plus size={24} />
      </Button>
    </div>
  );
}
