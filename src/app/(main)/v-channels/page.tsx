
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Plus, 
  Loader2, 
  Music2, 
  MoreVertical,
  ArrowLeft,
  Search,
  Zap,
  PlayCircle,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { VCommentsDialog } from '@/components/zynqo/VCommentsDialog';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const PAGE_SIZE = 5;

export default function VChannelsPage() {
  const { user } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [limitCount, setLimitCount] = useState(PAGE_SIZE);
  const observer = useRef<IntersectionObserver | null>(null);

  const postsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'creatorPosts'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
  }, [db, limitCount]);

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
    <div className="flex flex-col h-screen bg-black overflow-hidden relative">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-50 safe-top px-4 h-16 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-4">
           <h2 className="text-xl font-headline font-bold text-white flex items-center gap-2">
             Zynqo Channels <Zap size={16} className="text-yellow-500 fill-current" />
           </h2>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => router.push('/v-channels/search')} className="text-white hover:bg-white/10 rounded-full">
             <Search size={22} />
           </Button>
           <Button variant="ghost" size="icon" onClick={() => router.push('/v-channels/create')} className="text-white hover:bg-white/10 rounded-full">
             <Plus size={24} />
           </Button>
        </div>
      </div>

      {/* Vertical Feed */}
      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar">
        {posts.length > 0 ? (
          posts.map((post: any, i: number) => (
            <VideoPostCard 
              key={post.id} 
              post={post} 
              ref={posts.length === i + 1 ? lastPostRef : null} 
            />
          ))
        ) : !loading && (
          <div className="h-full flex flex-col items-center justify-center text-white p-8 text-center gap-4">
             <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <PlayCircle size={40} className="text-muted-foreground opacity-30" />
             </div>
             <p className="text-sm text-muted-foreground">No channels content found. Be the first to share!</p>
             <Button onClick={() => router.push('/v-channels/create')} className="rounded-full bg-primary">Start Creating</Button>
          </div>
        )}
        {loading && (
          <div className="h-screen flex items-center justify-center bg-black">
             <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}
      </div>
    </div>
  );
}

const VideoPostCard = ({ post, ref }: { post: any, ref?: any }) => {
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
    updateDoc(postRef, {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  const handleVideoClick = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDelete = async () => {
    if (!db || !user || user.uid !== post.creatorId) return;
    const postRef = doc(db, 'creatorPosts', post.id);
    deleteDoc(postRef)
      .then(() => {
        toast({ title: "Post removed from your channel" });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: postRef.path,
          operation: 'delete'
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const isMe = user?.uid === post.creatorId;

  return (
    <div ref={ref} className="h-screen w-full snap-start relative flex flex-col justify-center bg-black overflow-hidden">
      {post.type === 'video' ? (
        <video 
          ref={videoRef}
          src={post.mediaUrl}
          className="w-full h-full object-contain cursor-pointer"
          loop
          playsInline
          onClick={handleVideoClick}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      ) : post.type === 'image' ? (
        <div className="relative w-full h-full">
           <Image src={post.mediaUrl} alt="Post" fill className="object-contain" />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center p-12 bg-gradient-to-br from-primary/10 to-background">
          <p className="text-xl font-medium text-center leading-relaxed text-white/90">
            {post.caption}
          </p>
        </div>
      )}

      {/* Interaction Bar */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-20">
        <div className="flex flex-col items-center gap-1">
           <div 
             onClick={() => router.push(`/v-channels/${post.creatorId}`)}
             className="relative mb-4"
           >
             <Avatar className="w-12 h-12 border-2 border-white">
                <AvatarImage src={post.creatorAvatar} />
                <AvatarFallback>{post.creatorName?.[0]}</AvatarFallback>
             </Avatar>
             <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary rounded-full p-0.5 border-2 border-black">
                <Plus size={10} className="text-white" />
             </div>
           </div>
        </div>

        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
           <div className={cn("p-2 rounded-full transition-transform active:scale-125", isLiked ? "text-red-500" : "text-white")}>
              <Heart size={32} className={isLiked ? "fill-current" : ""} />
           </div>
           <span className="text-[10px] font-bold text-white shadow-sm">{post.likes?.length || 0}</span>
        </button>

        <button onClick={() => setIsCommentsOpen(true)} className="flex flex-col items-center gap-1">
           <div className="p-2 text-white transition-transform active:scale-125">
              <MessageCircle size={32} />
           </div>
           <span className="text-[10px] font-bold text-white shadow-sm">{post.commentsCount || 0}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
           <div className="p-2 text-white transition-transform active:scale-125">
              <Share2 size={32} />
           </div>
           <span className="text-[10px] font-bold text-white shadow-sm">{post.sharesCount || 0}</span>
        </button>

        {isMe && (
          <button onClick={handleDelete} className="flex flex-col items-center gap-1 mt-2 opacity-50 hover:opacity-100 transition-opacity">
            <div className="p-2 text-white">
               <Trash2 size={24} />
            </div>
          </button>
        )}
      </div>

      {/* Info Overlay */}
      {(post.type !== 'text' || post.mediaUrl) && (
        <div className="absolute bottom-16 left-0 right-16 p-4 z-10 bg-gradient-to-t from-black/80 to-transparent">
          <h4 className="font-bold text-white text-base mb-1 cursor-pointer" onClick={() => router.push(`/v-channels/${post.creatorId}`)}>
            @{post.creatorName}
          </h4>
          <p className="text-sm text-white/90 line-clamp-2 leading-relaxed mb-3">
            {post.caption}
          </p>
          <div className="flex items-center gap-2 text-white/60">
             <Music2 size={12} className="animate-spin-slow" />
             <span className="text-[10px] font-medium tracking-wide truncate">Original Sound - {post.creatorName}</span>
          </div>
        </div>
      )}

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
