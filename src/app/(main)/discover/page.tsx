
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AppHeader } from '@/components/zynqo/AppHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Users, 
  Search, 
  Radio, 
  Heart, 
  Sparkles, 
  Loader2, 
  MessageSquare,
  Navigation,
  ChevronRight,
  Plus,
  LocateFixed,
  Ghost,
  Shield,
  Badge,
  PlayCircle,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CommentsDialog } from '@/components/zynqo/CommentsDialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Distance calculation
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const INITIAL_MOMENTS_LIMIT = 5;
const MOMENTS_INCREMENT = 5;

export default function DiscoverPage() {
  const { user, profile } = useAuth();
  const db = useFirestore();
  const router = useRouter();

  // --- Shared State ---
  const [activeTab, setActiveTab] = useState('moments');

  // --- Moments Logic ---
  const [momentsLimit, setMomentsLimit] = useState(INITIAL_MOMENTS_LIMIT);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const momentsObserver = useRef<IntersectionObserver | null>(null);

  const momentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'moments'), orderBy('createdAt', 'desc'), limit(momentsLimit));
  }, [db, momentsLimit]);

  const { data: moments = [], loading: momentsLoading } = useCollection(momentsQuery);
  const hasMoreMoments = moments.length === momentsLimit;

  const lastMomentRef = useCallback((node: HTMLDivElement | null) => {
    if (momentsLoading) return;
    if (momentsObserver.current) momentsObserver.current.disconnect();
    momentsObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreMoments) {
        setMomentsLimit(prev => prev + MOMENTS_INCREMENT);
      }
    });
    if (node) momentsObserver.current.observe(node);
  }, [momentsLoading, hasMoreMoments]);

  const handleToggleLike = (momentId: string, currentLikes: string[] = []) => {
    if (!db || !user) return;
    const momentRef = doc(db, 'moments', momentId);
    const isLiked = currentLikes.includes(user.uid);
    updateDoc(momentRef, {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    }).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: momentRef.path,
        operation: 'update',
        requestResourceData: { likes: isLiked ? 'arrayRemove' : 'arrayUnion' }
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  // --- Nearby Logic ---
  const [nearbyLocation, setNearbyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('hideLocation', '==', false));
  }, [db]);
  const { data: allUsers = [], loading: usersLoading } = useCollection(usersQuery);

  const channelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'channels'), where('type', '==', 'public'));
  }, [db]);
  const { data: channels = [], loading: channelsLoading } = useCollection(channelsQuery);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setNearbyError("Geolocation not supported");
      return;
    }
    setIsUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setNearbyLocation({ lat: latitude, lng: longitude });
        setNearbyError(null);
        if (user && db && !profile?.hideLocation) {
          updateDoc(doc(db, 'users', user.uid), {
            latitude, longitude, lastLocationUpdate: serverTimestamp()
          }).catch(() => {});
        }
        setIsUpdatingLocation(false);
      },
      () => {
        setNearbyError("Location access denied");
        setIsUpdatingLocation(false);
      }
    );
  };

  useEffect(() => {
    if (activeTab === 'nearby' && !profile?.hideLocation && !nearbyLocation) {
      requestLocation();
    }
  }, [activeTab, profile?.hideLocation]);

  const nearbyUsers = useMemo(() => {
    if (!nearbyLocation) return [];
    return allUsers
      .filter((u: any) => u.uid !== user?.uid && u.latitude && u.longitude)
      .map((u: any) => ({
        ...u,
        distance: getDistance(nearbyLocation.lat, nearbyLocation.lng, u.latitude, u.longitude)
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [allUsers, nearbyLocation, user?.uid]);

  const nearbyChannels = useMemo(() => {
    if (!nearbyLocation) return [];
    return channels
      .filter((c: any) => c.latitude && c.longitude)
      .map((c: any) => ({
        ...c,
        distance: getDistance(nearbyLocation.lat, nearbyLocation.lng, c.latitude, c.longitude)
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [channels, nearbyLocation]);

  return (
    <div className="flex flex-col animate-fade-in bg-[#0E0C12] min-h-screen pb-20">
      <AppHeader title="Discover" showSearch={false} />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-[72px] z-40 bg-[#0E0C12]/80 backdrop-blur-xl border-b border-white/5">
          <TabsList className="w-full h-14 bg-transparent p-0 flex justify-center gap-8">
            <TabsTrigger 
              value="moments" 
              className="bg-transparent border-none text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent font-bold uppercase tracking-widest text-[10px] relative transition-all"
            >
              Moments
              {activeTab === 'moments' && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(159,95,245,0.5)]" />}
            </TabsTrigger>
            <TabsTrigger 
              value="nearby" 
              className="bg-transparent border-none text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent font-bold uppercase tracking-widest text-[10px] relative transition-all"
            >
              Nearby
              {activeTab === 'nearby' && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(159,95,245,0.5)]" />}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="moments" className="m-0 p-4 space-y-4">
          {moments.map((moment: any, idx) => {
            const isLast = idx === moments.length - 1;
            const isLiked = moment.likes?.includes(user?.uid);
            return (
              <div 
                key={moment.id} 
                ref={isLast ? lastMomentRef : null}
                className="bg-card rounded-[2rem] overflow-hidden border border-white/5 shadow-xl animate-fade-in"
              >
                <div className="p-5 flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-primary/20">
                    <AvatarImage src={moment.userPhoto} />
                    <AvatarFallback>{moment.userName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-sm leading-none">{moment.userName}</h4>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 block">
                      {moment.createdAt?.toDate ? formatDistanceToNow(moment.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                    </span>
                  </div>
                </div>
                {moment.content && <div className="px-5 pb-4"><p className="text-sm leading-relaxed opacity-90">{moment.content}</p></div>}
                {moment.imageUrl && (
                  <div className="relative aspect-[4/3] w-full bg-muted/20">
                    <Image src={moment.imageUrl} alt="Moment" fill className="object-cover" />
                  </div>
                )}
                {moment.videoUrl && (
                  <div className="relative aspect-video w-full bg-black/40">
                    <video src={moment.videoUrl} className="w-full h-full object-contain" controls />
                  </div>
                )}
                <div className="px-5 py-4 border-t border-white/5 flex items-center gap-6">
                  <button onClick={() => handleToggleLike(moment.id, moment.likes)} className={cn("flex items-center gap-2 group transition-colors", isLiked ? "text-red-500" : "text-muted-foreground")}>
                    <Heart size={20} className={cn(isLiked && "fill-current")} />
                    <span className="text-xs font-bold">{moment.likes?.length || 0}</span>
                  </button>
                  <button onClick={() => { setSelectedMomentId(moment.id); setIsCommentsOpen(true); }} className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare size={20} />
                    <span className="text-xs font-bold">Comments</span>
                  </button>
                </div>
              </div>
            );
          })}
          {momentsLoading && <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>}
          {!hasMoreMoments && moments.length > 0 && <p className="text-center text-[10px] text-muted-foreground uppercase font-black opacity-30 py-4">No more moments</p>}
          <Button onClick={() => router.push('/moments/create')} className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 z-50 transition-transform active:scale-90" size="icon">
            <Plus size={24} />
          </Button>
        </TabsContent>

        <TabsContent value="nearby" className="m-0 p-4">
          {profile?.hideLocation ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
              <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                <Ghost size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Ghost Mode Active</h3>
                <p className="text-xs text-muted-foreground leading-relaxed px-8">Enable location sharing in your profile settings to see people nearby.</p>
              </div>
              <Button onClick={() => router.push('/profile/edit')} className="rounded-2xl bg-primary">Settings</Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-card/40 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center gap-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 animate-ping rounded-full" />
                  <div className="relative w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center text-primary">
                    <Navigation size={32} className="animate-spin-slow" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-headline font-bold">Discovery Radar</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Scanning for social energy nearby</p>
                </div>
                {nearbyError ? (
                  <Badge variant="destructive" className="bg-destructive/10 text-destructive border-none px-4 py-1">
                    <Shield size={12} className="mr-2" /> {nearbyError}
                  </Badge>
                ) : nearbyLocation ? (
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <LocateFixed size={14} className="text-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Signal Locked</span>
                  </div>
                ) : (
                  <Loader2 className="animate-spin text-primary" size={24} />
                )}
              </div>

              <section className="space-y-4">
                <h3 className="font-headline font-bold text-lg px-2 flex items-center gap-2"><Users size={16} className="text-primary" /> People Nearby</h3>
                <div className="flex flex-col gap-3">
                  {nearbyUsers.map((u: any) => (
                    <div key={u.uid} onClick={() => router.push(`/users/${u.uid}`)} className="flex items-center justify-between bg-card/40 p-4 rounded-3xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 rounded-2xl border border-primary/20">
                          <AvatarImage src={u.profilePhoto} />
                          <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm">{u.displayName}</h4>
                          <span className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1 block">
                            {u.distance < 1 ? `${Math.round(u.distance * 1000)}m away` : `${u.distance.toFixed(1)}km away`}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </div>
                  ))}
                  {nearbyUsers.length === 0 && !usersLoading && <p className="text-center py-10 text-xs text-muted-foreground italic">No users found within range.</p>}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="font-headline font-bold text-lg px-2 flex items-center gap-2"><Radio size={16} className="text-secondary" /> Local Channels</h3>
                <div className="flex flex-col gap-3">
                  {nearbyChannels.map((c: any) => (
                    <div key={c.id} onClick={() => router.push(`/channels/${c.id}`)} className="flex items-center justify-between bg-secondary/5 p-4 rounded-3xl border border-secondary/10 hover:bg-secondary/10 transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 rounded-2xl border border-secondary/20 bg-secondary/10">
                          <AvatarImage src={c.photo} />
                          <AvatarFallback><Radio size={20} /></AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm">{c.name}</h4>
                          <span className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-1 block">
                            {c.distance < 1 ? `${Math.round(c.distance * 1000)}m away` : `${c.distance.toFixed(1)}km away`}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-secondary/30 group-hover:text-secondary transition-colors" />
                    </div>
                  ))}
                  {nearbyChannels.length === 0 && !channelsLoading && <p className="text-center py-10 text-xs text-muted-foreground italic">No local channels found.</p>}
                </div>
              </section>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedMomentId && (
        <CommentsDialog 
          momentId={selectedMomentId} 
          isOpen={isCommentsOpen} 
          onOpenChange={setIsCommentsOpen} 
        />
      )}
    </div>
  );
}
