
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
  increment
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
  MoreVertical
} from 'lucide-react';
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

export default function CreatorChannelProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

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

  // Check if following via user_follows collection
  const followRef = useMemoFirebase(() => (user && id) ? doc(db, 'user_follows', `${user.uid}_${id}`) : null, [db, user?.uid, id]);
  const { data: followData, loading: followLoading } = useDoc(followRef);
  const isFollowing = !!followData;

  const isMe = user?.uid === id;

  const handleFollow = async () => {
    if (!db || !user || !id || isMe) return;
    const fRef = doc(db, 'user_follows', `${user.uid}_${id}`);
    const cRef = doc(db, 'creatorChannels', id as string);

    try {
      if (isFollowing) {
        await deleteDoc(fRef);
        await updateDoc(cRef, { followerCount: increment(-1) });
        toast({ title: "Unfollowed" });
      } else {
        await setDoc(fRef, {
          followerId: user.uid,
          followingId: id,
          createdAt: serverTimestamp()
        });
        await updateDoc(cRef, { followerCount: increment(1) });
        toast({ title: "Following!" });
      }
    } catch (err) {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const handleDeleteChannel = async () => {
    if (!db || !id || !isMe) return;
    try {
      await deleteDoc(doc(db, 'creatorChannels', id as string));
      toast({ title: "Channel Deleted" });
      router.push('/v-channels');
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (channelLoading || postsLoading || followLoading) return (
    <div className="h-screen bg-[#0E0C12] flex items-center justify-center">
       <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (!channel) return (
    <div className="h-screen bg-[#0E0C12] flex flex-col items-center justify-center p-8 text-center gap-4">
       <p className="text-muted-foreground">Channel not found.</p>
       <Button onClick={() => router.push('/v-channels')} variant="outline">Back to Feed</Button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] text-white pb-20 animate-fade-in">
      <div className="relative h-64 w-full">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-background z-0" />
         <header className="relative z-10 safe-top flex items-center justify-between px-2 h-16">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white rounded-full">
              <ChevronLeft size={28} />
            </Button>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="text-white rounded-full">
                <Share2 size={22} />
              </Button>
              {isMe && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full">
                      <Trash2 size={22} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-white/10 rounded-[2rem]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Channel?</AlertDialogTitle>
                      <AlertDialogDescription>Permanently remove your creator profile. Your posts will remain visible unless deleted manually.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteChannel} className="rounded-xl bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="ghost" size="icon" className="text-white rounded-full">
                <MoreVertical size={22} />
              </Button>
            </div>
         </header>

         <div className="absolute -bottom-16 left-0 right-0 px-6 flex flex-col items-center">
            <div className="relative">
               <Avatar className="w-28 h-28 border-4 border-[#0E0C12] shadow-2xl">
                  <AvatarImage src={channel.avatar} />
                  <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">{channel.name?.[0]}</AvatarFallback>
               </Avatar>
               {channel.isVerified && (
                 <div className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-1 border-2 border-[#0E0C12]">
                   <ShieldCheck size={14} />
                 </div>
               )}
            </div>
            <div className="mt-4 text-center">
               <h3 className="text-2xl font-headline font-bold">{channel.name}</h3>
               <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">@{channel.username}</p>
            </div>
         </div>
      </div>

      <div className="mt-20 px-6 flex flex-col items-center gap-6">
         <div className="flex items-center gap-8 text-center">
            <div className="flex flex-col">
               <span className="text-lg font-headline font-bold">{posts.length}</span>
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Posts</span>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="flex flex-col">
               <span className="text-lg font-headline font-bold">{channel.followerCount || 0}</span>
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Followers</span>
            </div>
         </div>

         {isMe ? (
           <Button 
             onClick={() => router.push(`/v-channels/edit/${channel.id}`)}
             className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10"
           >
             <Edit3 size={18} className="mr-2" />
             Edit Channel Info
           </Button>
         ) : (
           <Button 
             onClick={handleFollow}
             className={cn(
               "w-full h-12 rounded-2xl font-bold transition-all shadow-lg",
               isFollowing ? "bg-white/5 border border-white/10 text-white" : "bg-primary text-white shadow-primary/20"
             )}
           >
             {isFollowing ? 'Following' : 'Follow Channel'}
           </Button>
         )}

         {channel.bio && (
           <p className="text-sm text-center text-muted-foreground italic leading-relaxed px-4">"{channel.bio}"</p>
         )}
      </div>

      <div className="mt-8 flex items-center justify-center border-y border-white/5 bg-card/20">
         <button className="flex-1 py-4 flex flex-col items-center gap-1 border-b-2 border-primary">
            <Grid size={20} className="text-primary" />
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Grid</span>
         </button>
      </div>

      <div className="grid grid-cols-3 gap-0.5 mt-0.5">
         {posts.map((post: any) => (
           <div key={post.id} className="relative aspect-[3/4] bg-white/5 overflow-hidden group cursor-pointer">
              {post.type === 'video' ? (
                <div className="w-full h-full relative">
                   <VideoIcon className="absolute top-2 right-2 text-white/60 z-10" size={16} />
                   <video src={post.mediaUrl} className="w-full h-full object-cover" muted playsInline />
                </div>
              ) : post.type === 'image' ? (
                <Image src={post.mediaUrl} alt="Post" fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center p-4 text-[8px] text-muted-foreground italic">"{post.caption}"</div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2">
                 <Heart size={10} className="text-white fill-current" />
                 <span className="text-[8px] font-black text-white">{post.likeCount || post.likes?.length || 0}</span>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
