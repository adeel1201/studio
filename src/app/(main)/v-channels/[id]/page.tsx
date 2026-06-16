
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { 
  doc, 
  updateDoc, 
  query, 
  collection, 
  where, 
  orderBy, 
  deleteDoc,
  setDoc,
  serverTimestamp,
  increment,
  limit
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Grid, 
  ShieldCheck, 
  Loader2, 
  Heart,
  Video as VideoIcon,
  Trash2,
  Share2,
  Edit3,
  MoreVertical,
  Lock,
  Bookmark,
  Plus,
  PlayCircle,
  Globe,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

export default function CreatorChannelProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [activeStatModal, setActiveStatModal] = useState<'followers' | 'following' | null>(null);

  const channelRef = useMemoFirebase(() => (id && typeof id === 'string') ? doc(db, 'creatorChannels', id) : null, [db, id]);
  const { data: channel, loading: channelLoading } = useDoc(channelRef);

  const postsQuery = useMemoFirebase(() => {
    if (!db || !id) return null;
    return query(
      collection(db, 'creatorPosts'),
      where('creatorId', '==', id),
      orderBy('timestamp', 'desc')
    );
  }, [db, id]);

  const { data: posts = [], loading: postsLoading } = useCollection(postsQuery);

  // Check if following
  const followId = user && id ? `${user.uid}_${id}` : null;
  const followRef = useMemoFirebase(() => (followId) ? doc(db, 'user_follows', followId) : null, [db, followId]);
  const { data: followData, loading: followLoading } = useDoc(followRef);
  const isFollowing = !!followData;

  const isMe = user?.uid === channel?.creatorId;
  const isPrivate = channel?.privacy === 'private';
  const isHidden = channel?.privacy === 'hidden';
  const canViewContent = !isPrivate || isFollowing || isMe;

  const handleFollow = async () => {
    if (!db || !user || !id || isMe) return;
    const fRef = doc(db, 'user_follows', `${user.uid}_${id}`);
    const cRef = doc(db, 'creatorChannels', id as string);
    const uRef = doc(db, 'users', user.uid);

    try {
      if (isFollowing) {
        await deleteDoc(fRef);
        await updateDoc(cRef, { followerCount: increment(-1) });
        await updateDoc(uRef, { followingCount: increment(-1) });
        toast({ title: "Unfollowed" });
      } else {
        await setDoc(fRef, {
          followerId: user.uid,
          followingId: id,
          createdAt: serverTimestamp()
        });
        await updateDoc(cRef, { followerCount: increment(1) });
        await updateDoc(uRef, { followingCount: increment(1) });
        toast({ title: "Following!" });
      }
    } catch (err) {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  if (channelLoading || followLoading) return (
    <div className="h-screen bg-[#0E0C12] flex items-center justify-center">
       <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (!channel) return (
    <div className="h-screen bg-[#0E0C12] flex flex-col items-center justify-center p-8 text-center gap-4">
       <p className="text-muted-foreground">Channel not found.</p>
       <Button onClick={() => router.push('/v-channels')} variant="outline" className="rounded-2xl">Back to Feed</Button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] text-white pb-20 animate-fade-in relative">
      <header className="sticky top-0 z-50 safe-top flex items-center justify-between px-2 h-16 bg-[#0E0C12]/80 backdrop-blur-xl border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white rounded-full">
          <ChevronLeft size={28} />
        </Button>
        <div className="flex flex-col items-center">
           <h1 className="font-bold text-sm truncate max-w-[150px]">{channel.name}</h1>
           <span className="text-[8px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-1">
              {isPrivate ? <Lock size={8} /> : isHidden ? <EyeOff size={8} /> : <Globe size={8} />}
              {channel.privacy || 'public'}
           </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="text-white rounded-full">
            <Share2 size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-white rounded-full">
            <MoreVertical size={20} />
          </Button>
        </div>
      </header>

      <div className="px-6 pt-6 flex flex-col items-center">
        <div className="relative">
           <Avatar className="w-24 h-24 border-2 border-white/5 shadow-2xl">
              <AvatarImage src={channel.avatar} />
              <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">{channel.name?.[0]}</AvatarFallback>
           </Avatar>
           {channel.isVerified && (
             <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 border-2 border-[#0E0C12]">
               <ShieldCheck size={14} />
             </div>
           )}
        </div>
        
        <div className="mt-4 text-center">
           <h3 className="text-lg font-bold">@{channel.username}</h3>
           {isMe ? (
              <Button 
                onClick={() => router.push(`/v-channels/edit/${id}`)}
                variant="outline"
                className="mt-4 h-10 px-8 rounded-xl bg-white/5 border-white/10 text-xs font-bold hover:bg-white/10"
              >
                <Edit3 size={14} className="mr-2" /> Edit Channel
              </Button>
           ) : (
              <Button 
                onClick={handleFollow}
                className={cn(
                  "mt-4 h-10 px-12 rounded-xl font-bold transition-all text-xs",
                  isFollowing ? "bg-white/5 border border-white/10 text-white" : "bg-primary text-white shadow-lg shadow-primary/20"
                )}
              >
                {isFollowing ? <><UserCheck size={14} className="mr-2" /> Following</> : 'Follow'}
              </Button>
           )}
        </div>

        <div className="mt-6 flex items-center gap-6">
           <button onClick={() => setActiveStatModal('following')} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
              <span className="font-black text-sm">{channel.followingCount || 0}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Following</span>
           </button>
           <button onClick={() => setActiveStatModal('followers')} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
              <span className="font-black text-sm">{channel.followerCount || 0}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Followers</span>
           </button>
           <div className="flex items-center gap-1.5">
              <span className="font-black text-sm">{channel.totalLikes || 0}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Likes</span>
           </div>
        </div>

        {channel.bio && (
          <p className="mt-4 text-xs text-center text-muted-foreground leading-relaxed px-4 max-w-xs italic">
            "{channel.bio}"
          </p>
        )}
      </div>

      {!canViewContent ? (
        <div className="mt-12 flex flex-col items-center justify-center p-12 text-center bg-card/20 border-y border-white/5">
           <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-muted-foreground mb-6">
              <Lock size={32} />
           </div>
           <h4 className="font-bold text-lg">Private Channel</h4>
           <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-[200px]">
              Only approved followers can see the content shared by @{channel.username}.
           </p>
           {!isFollowing && (
              <Button 
                onClick={handleFollow}
                className="mt-6 rounded-2xl bg-primary px-8 h-12 font-bold shadow-lg shadow-primary/20"
              >
                Follow to Request Access
              </Button>
           )}
        </div>
      ) : (
        <Tabs defaultValue="videos" className="w-full mt-8">
          <TabsList className="w-full h-12 bg-transparent border-y border-white/5 p-0 rounded-none flex">
            <TabsTrigger value="videos" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent text-muted-foreground data-[state=active]:text-primary transition-all">
               <Grid size={18} />
            </TabsTrigger>
            <TabsTrigger value="liked" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent text-muted-foreground data-[state=active]:text-primary transition-all">
               <Heart size={18} />
            </TabsTrigger>
            <TabsTrigger value="private" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary bg-transparent text-muted-foreground data-[state=active]:text-primary transition-all">
               <Lock size={18} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-0">
            <div className="grid grid-cols-3 gap-0.5">
              {posts.map((post: any) => (
                <div key={post.id} onClick={() => router.push('/v-channels')} className="relative aspect-[3/4] bg-white/5 overflow-hidden cursor-pointer group">
                    {post.type === 'video' ? (
                      <video src={post.mediaUrl} className="w-full h-full object-cover" muted playsInline />
                    ) : post.type === 'image' ? (
                      <Image src={post.mediaUrl} alt="Post" fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center p-4 text-[10px] text-muted-foreground italic text-center">"{post.caption}"</div>
                    )}
                    <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
                      <PlayCircle size={10} className="text-white fill-current" />
                      <span className="text-[10px] font-bold text-white drop-shadow-md">{post.viewCount || 0}</span>
                    </div>
                </div>
              ))}
            </div>
            {posts.length === 0 && (
              <div className="py-20 flex flex-col items-center text-center px-8 gap-4">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground opacity-20">
                  <VideoIcon size={40} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white/60 uppercase tracking-widest">No broadcasts yet</p>
                  <p className="text-xs text-muted-foreground">Start sharing your social broadcasts with the world.</p>
                </div>
                {isMe && (
                  <Button 
                    onClick={() => router.push('/v-channels/create')}
                    className="rounded-full bg-primary px-8 mt-2 h-11 font-bold shadow-lg shadow-primary/20"
                  >
                    Upload Your First Video
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="liked">
             <div className="py-20 flex flex-col items-center text-muted-foreground/40 text-center px-8">
                <Lock size={40} className="mb-4" />
                <h4 className="text-sm font-bold text-white mb-1">Liked videos are restricted</h4>
                <p className="text-xs">Only the channel owner can view their interactions.</p>
             </div>
          </TabsContent>

          <TabsContent value="private">
             <div className="py-20 flex flex-col items-center text-muted-foreground/40">
                <Lock size={40} className="mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Drafts Folder</p>
             </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Owner-only Floating Upload Button */}
      {isMe && (
        <Button 
          onClick={() => router.push('/v-channels/create')}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 z-50 transition-transform active:scale-90 flex items-center justify-center"
          size="icon"
        >
          <Plus size={28} />
        </Button>
      )}

      {/* Follower/Following Modals */}
      <StatListModal 
        isOpen={!!activeStatModal} 
        onClose={() => setActiveStatModal(null)} 
        type={activeStatModal || 'followers'} 
        targetId={id as string} 
      />
    </div>
  );
}

function StatListModal({ isOpen, onClose, type, targetId }: { isOpen: boolean; onClose: () => void; type: 'followers' | 'following'; targetId: string }) {
  const db = useFirestore();
  const q = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'user_follows'),
      where(type === 'followers' ? 'followingId' : 'followerId', '==', targetId),
      limit(50)
    );
  }, [db, type, targetId]);

  const { data: follows = [], loading } = useCollection(q);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0E0C12] border-white/5 text-white sm:max-w-[400px] h-[60vh] flex flex-col p-0 overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]">
        <DialogHeader className="p-4 border-b border-white/5">
           <DialogTitle className="text-center font-bold text-sm capitalize">{type}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
           {loading ? (
             <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
           ) : follows.length > 0 ? (
             follows.map((f: any) => (
               <div key={f.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <Avatar className="w-10 h-10 border border-white/5">
                        <AvatarFallback>{type === 'followers' ? 'U' : 'C'}</AvatarFallback>
                     </Avatar>
                     <div>
                        <p className="text-xs font-bold">User {f.id.slice(0, 5)}</p>
                        <p className="text-[10px] text-muted-foreground">Joined Zynqo</p>
                     </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold border-white/10">View</Button>
               </div>
             ))
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40">
                <p className="text-xs">No {type} found</p>
             </div>
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
