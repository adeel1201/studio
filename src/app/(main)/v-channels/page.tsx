"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/hooks/use-firebase';
import { collection, query, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, where, increment } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Plus, 
  Loader2, 
  Music2, 
  Search,
  PlayCircle,
  Trash2,
  Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { VCommentsDialog } from '@/components/zynqo/VCommentsDialog';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 5;

export default function VChannelsPage() {
  const { user } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [feedType, setFeedType] = useState<'following' | 'for-you'>('for-you');
  const [limitCount, setLimitCount] = useState(PAGE_SIZE);
  const observer = useRef<IntersectionObserver | null>(null);

  const followingQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'user_follows'),
      where('followerId', '==', user.uid)
    );
  }, [db, user?.uid]);

  const { data: follows = [] } = useCollection(followingQuery);
  const followingIds = useMemo(() => (follows as any[]).map(f => f.followingId), [follows]);

  const postsQuery = useMemoFirebase(() => {
    if (!db) return null;
    if (feedType === 'following') {
      if (followingIds.length === 0) return null;
      return query(
        collection(db, 'creatorPosts'),
        where('creatorId', 'in', followingIds.slice(0, 10)),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }
    return query(
      collection(db, 'creatorPosts'),
      where('privacy', '==', 'public'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
  }, [db, feedType, followingIds, limitCount]);

  const { data: posts = [], loading } = useCollection(postsQuery);

  const lastPostRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setLimitCount(prev => prev + PAGE_SIZE);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading]);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 z-50 safe-top px-4 h-20 flex items-center justify-between bg-gradient-to-b from-white/90 via-white/40 to-transparent">
        <div className="flex items-center gap-6">
           <button 
             onClick={() => { setFeedType('following'); setLimitCount(PAGE_SIZE); }}
             className={cn(
               "text-base font-bold transition-all relative py-2",
               feedType === 'following' ? "text-primary scale-110" : "text-muted-foreground"
             )}
           >
             Following
             {feedType === 'following' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(159,95,245,0.3)]" />}
           </button>
           <button 
             onClick={() => { setFeedType('for-you'); setLimitCount(PAGE_SIZE); }}
             className={cn(
               "text-base font-bold transition-all relative py-2",
               feedType === 'for-you' ? "text-primary scale-110" : "text-muted-foreground"
             )}
           >
             For You
             {feedType === 'for-you' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(159,95,245,0.3)]" />}
           </button>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => router.push('/v-channels/search')} className="text-muted-foreground hover:bg-black/5 rounded-full">
             <Search size={22} />
           </Button>
           <Button variant="ghost" size="icon" onClick={() => router.push('/v-channels/create')} className="text-muted-foreground hover:bg-black/5 rounded-full">
             <Plus size={24} />
           </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar">
        {posts.length > 0 ? (
          posts.map((post: any, i: number) => (
            <VideoPostCard 
              key={post.id} 
              post={post} 
              isLast={posts.length === i + 1}
              onLastRef={lastPostRef}
            />
          ))
        ) : !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-foreground p-12 text-center gap-6">
             <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <PlayCircle size={48} className="text-muted-foreground opacity-20" />
             </div>
             <div className="space-y-2">
               <h3 className="text-lg font-bold">
                 {feedType === 'following' ? "No following content" : "No broadcasts yet"}
               </h3>
               <p className="text-sm text-muted-foreground leading-relaxed">
                 {feedType === 'following' 
                   ? "You haven't followed any creators yet. Explore 'For You' to find interesting channels!" 
                   : "Be the first to share your broadcast with the Zynqo community."}
               </p>
             </div>
             <Button 
               onClick={() => feedType === 'following' ? setFeedType('for-you') : router.push('/v-channels/create')} 
               className="rounded-full bg-primary px-8 h-12 font-bold shadow-xl shadow-primary/20 text-white"
             >
               {feedType === 'following' ? "Explore For You" : "Start Creating"}
             </Button>
          </div>
        ) : null}
        {loading && (
          <div className="h-screen flex items-center justify-center bg-white">
             <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}
      </div>
    </div>
  );
}

const VideoPostCard = ({ post, isLast, onLastRef }: { post: any, isLast: boolean, onLastRef: (node: HTMLDivElement | null) => void }) => {
  const { user } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  useEffect(() => {
    setIsLiked(post.likes?.includes(user?.uid));
  }, [post.likes, user?.uid]);

  const toggleLike = async () => {
    if (!db || !user) return;
    const postRef = doc(db, 'creatorPosts', post.id);
    const creatorChannelRef = doc(db, 'creatorChannels', post.creatorId);
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    
    try {
      await updateDoc(postRef, {
        likes: newLiked ? arrayUnion(user.uid) : arrayRemove(user.uid),
        likeCount: increment(newLiked ? 1 : -1)
      });
      await updateDoc(creatorChannelRef, {
        totalLikes: increment(newLiked ? 1 : -1)
      });
    } catch (e) { console.error(e); }
  };

  const handleVideoClick = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const isMe = user?.uid === post.creatorId;

  return (
    <div ref={isLast ? onLastRef : null} className="h-screen w-full snap-start relative flex flex-col justify-center bg-white overflow-hidden">
      {post.type === 'video' ? (
        <video 
          ref={videoRef}
          src={post.mediaUrl}
          className="w-full h-full object-contain cursor-pointer bg-black"
          loop
          playsInline
          onClick={handleVideoClick}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      ) : post.type === 'image' ? (
        <div className="relative w-full h-full bg-muted/20">
           <Image src={post.mediaUrl} alt="Post" fill className="object-contain" unoptimized />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center p-12 bg-gradient-to-br from-primary/5 via-white to-secondary/5">
          <p className="text-xl font-medium text-center leading-relaxed text-foreground italic">
            "{post.caption}"
          </p>
        </div>
      )}

      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-20">
        <div className="flex flex-col items-center gap-1">
           <div onClick={() => router.push(`/v-channels/${post.creatorId}`)} className="relative mb-4 cursor-pointer">
             <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
                <AvatarImage src={post.creatorAvatar} />
                <AvatarFallback>{post.creatorName?.[0]}</AvatarFallback>
             </Avatar>
             {!isMe && (
               <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary rounded-full p-0.5 border-2 border-white">
                  <Plus size={10} className="text-white" />
               </div>
             )}
           </div>
        </div>

        <button onClick={toggleLike} className="flex flex-col items-center gap-1 group">
           <div className={cn("p-2 rounded-full transition-transform active:scale-125", isLiked ? "text-red-500" : "text-foreground drop-shadow-md")}>
              <Heart size={32} className={isLiked ? "fill-current" : ""} />
           </div>
           <span className="text-[10px] font-bold text-foreground drop-shadow-md">{post.likeCount || 0}</span>
        </button>

        <button onClick={() => setIsCommentsOpen(true)} className="flex flex-col items-center gap-1 group">
           <div className="p-2 text-foreground transition-transform active:scale-125 drop-shadow-md">
              <MessageCircle size={32} />
           </div>
           <span className="text-[10px] font-bold text-foreground drop-shadow-md">{post.commentsCount || 0}</span>
        </button>

        <button className="flex flex-col items-center gap-1 group">
           <div className="p-2 text-foreground transition-transform active:scale-125 drop-shadow-md">
              <Share2 size={32} />
           </div>
           <span className="text-[10px] font-bold text-foreground drop-shadow-md">{post.sharesCount || 0}</span>
        </button>
      </div>

      <div className="absolute bottom-16 left-0 right-16 p-4 z-10 bg-gradient-to-t from-white/95 via-white/60 to-transparent">
        <h4 className="font-bold text-foreground text-base mb-1 cursor-pointer flex items-center gap-2" onClick={() => router.push(`/v-channels/${post.creatorId}`)}>
          @{post.creatorName}
          {post.isVerified && <Zap size={12} className="text-yellow-500 fill-current" />}
        </h4>
        <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed mb-3">
          {post.caption}
        </p>
        <div className="flex items-center gap-2 text-muted-foreground">
           <Music2 size={12} className="animate-spin-slow" />
           <span className="text-[10px] font-medium tracking-wide truncate">Original Sound - {post.creatorName}</span>
        </div>
      </div>

      {isCommentsOpen && (
        <VCommentsDialog 
          postId={post.id} 
          isOpen={isCommentsOpen} 
          onOpenChange={setIsCommentsOpen} 
        />
      )}
    </div>
  );
};
