"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  doc, 
  updateDoc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Maximize2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function CallOverlay() {
  const { user } = useAuth();
  const db = useFirestore();
  
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  // Listen for incoming calls
  const incomingCallsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing'),
      limit(1)
    );
  }, [db, user?.uid]);

  const { data: incomingCalls } = useCollection(incomingCallsQuery);

  // Listen for outgoing calls (where I am caller and it's active)
  const outgoingCallsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'calls'),
      where('callerId', '==', user.uid),
      where('status', 'in', ['ringing', 'ongoing']),
      limit(1)
    );
  }, [db, user?.uid]);

  const { data: outgoingCalls } = useCollection(outgoingCallsQuery);

  // Handle call state
  useEffect(() => {
    const currentCall = incomingCalls?.[0] || outgoingCalls?.[0];
    if (currentCall) {
      setActiveCall(currentCall);
    } else {
      setActiveCall(null);
      setDuration(0);
    }
  }, [incomingCalls, outgoingCalls]);

  // Duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeCall?.status === 'ongoing') {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeCall?.status]);

  if (!activeCall) return null;

  const isIncoming = activeCall.receiverId === user?.uid && activeCall.status === 'ringing';
  const isOutgoing = activeCall.callerId === user?.uid && activeCall.status === 'ringing';
  const isOngoing = activeCall.status === 'ongoing';
  
  const partnerName = isIncoming ? activeCall.callerName : activeCall.receiverName;
  const partnerPhoto = isIncoming ? activeCall.callerPhoto : activeCall.receiverPhoto;

  const handleAccept = () => {
    if (!db) return;
    updateDoc(doc(db, 'calls', activeCall.id), {
      status: 'ongoing',
      startTime: serverTimestamp()
    });
  };

  const handleDecline = () => {
    if (!db) return;
    updateDoc(doc(db, 'calls', activeCall.id), {
      status: isIncoming ? 'missed' : 'ended',
      endTime: serverTimestamp()
    });
  };

  const handleEnd = () => {
    if (!db) return;
    updateDoc(doc(db, 'calls', activeCall.id), {
      status: 'ended',
      endTime: serverTimestamp(),
      duration: duration
    });
  };

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300">
      <div className="relative w-full max-w-sm aspect-[9/16] bg-card rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col items-center justify-between py-16 px-8">
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-background pointer-events-none" />
        
        {/* User Info */}
        <div className="relative z-10 flex flex-col items-center gap-6 mt-8">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-2xl animate-pulse-soft">
              <AvatarImage src={partnerPhoto} />
              <AvatarFallback className="text-4xl font-bold">{partnerName?.[0]}</AvatarFallback>
            </Avatar>
            {isOngoing && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg">
                {formatDuration(duration)}
              </div>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-headline font-bold text-foreground">{partnerName}</h2>
            <p className="text-xs text-primary font-bold uppercase tracking-[0.3em] mt-2 animate-pulse">
              {isIncoming ? 'Incoming Call...' : isOutgoing ? 'Calling...' : 'Call in progress'}
            </p>
          </div>
        </div>

        {/* Video Placeholder */}
        {activeCall.type === 'video' && isOngoing && (
          <div className="relative w-full aspect-video bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden">
             <Video className="text-primary/20" size={48} />
             <div className="absolute top-4 right-4 w-24 aspect-[3/4] bg-card/60 border border-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                <span className="text-[8px] font-bold text-muted-foreground uppercase">YOU</span>
             </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="relative z-10 w-full flex flex-col gap-8 items-center pb-8">
          {isIncoming && (
            <div className="flex gap-12 items-center">
              <Button 
                onClick={handleDecline} 
                className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-xl shadow-destructive/20"
                size="icon"
              >
                <PhoneOff size={28} />
              </Button>
              <Button 
                onClick={handleAccept} 
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20"
                size="icon"
              >
                <Phone size={28} />
              </Button>
            </div>
          )}

          {isOutgoing && (
            <Button 
              onClick={handleDecline} 
              className="w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90 shadow-2xl shadow-destructive/30"
              size="icon"
            >
              <PhoneOff size={32} />
            </Button>
          )}

          {isOngoing && (
            <div className="flex flex-col gap-8 w-full">
              <div className="flex justify-around items-center px-4">
                <Button 
                  variant="ghost" size="icon" 
                  onClick={() => setIsMuted(!isMuted)}
                  className={cn("w-14 h-14 rounded-2xl bg-white/5 border border-white/5", isMuted && "bg-primary text-white")}
                >
                  {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </Button>
                {activeCall.type === 'video' && (
                  <Button 
                    variant="ghost" size="icon" 
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={cn("w-14 h-14 rounded-2xl bg-white/5 border border-white/5", isVideoOff && "bg-primary text-white")}
                  >
                    {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                  </Button>
                )}
                <Button 
                  variant="ghost" size="icon" 
                  className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5"
                >
                  <Maximize2 size={22} />
                </Button>
              </div>
              <Button 
                onClick={handleEnd} 
                className="w-full h-16 rounded-3xl bg-destructive hover:bg-destructive/90 font-bold text-lg shadow-xl shadow-destructive/20"
              >
                End Call
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
