"use client";

import { AppHeader } from '@/components/zynqo/AppHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Loader2, MessageSquare, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function MomentsPage() {
  const db = useFirestore();
  const { user } = useAuth();
  const router = useRouter();

  const momentsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'moments'), orderBy('createdAt', 'desc'), limit(50));
  }, [db]);

  const { data: moments = [], loading } = useCollection(momentsQuery);

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

  return (
    <div className="flex flex-col animate-fade-in bg-[#0E0C12] min-h-screen">
      <AppHeader title="Moments" showActions={false} />
      
      <div className="flex flex-col gap-4 p-4 pb-32">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Syncing Feed...</p>
          </div>
        ) : moments.length > 0 ? (
          moments.map((moment: any) => {
            const date = moment.createdAt?.toDate ? moment.createdAt.toDate() : new Date();
            const timeAgo = formatDistanceToNow(date, { addSuffix: true });
            const isLiked = moment.likes?.includes(user?.uid);
            const likeCount = moment.likes?.length || 0;

            return (
              <div 
                key={moment.id} 
                className="bg-card rounded-[2rem] overflow-hidden border border-white/5 shadow-xl transition-all duration-300"
              >
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-primary/20">
                      <AvatarImage src={moment.userPhoto} />
                      <AvatarFallback>{moment.userName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-sm leading-none flex items-center gap-1">
                        {moment.userName}
                      </h4>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 block">
                        {timeAgo}
                      </span>
                    </div>
                  </div>
                </div>

                {moment.content && (
                  <div className="px-5 pb-4">
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {moment.content}
                    </p>
                  </div>
                )}

                {moment.imageUrl && (
                  <div className="relative aspect-[4/3] w-full bg-muted/20">
                    <Image 
                      src={moment.imageUrl} 
                      alt="Moment Media" 
                      fill 
                      className="object-cover"
                      data-ai-hint="lifestyle photography"
                    />
                  </div>
                )}

                <div className="px-5 py-4 border-t border-white/5 flex items-center gap-6">
                  <button 
                    onClick={() => handleToggleLike(moment.id, moment.likes)}
                    className="flex items-center gap-2 group transition-colors"
                  >
                    <div className={cn(
                      "p-2 rounded-full transition-all duration-300",
                      isLiked ? "bg-red-500/10 text-red-500" : "bg-white/5 text-muted-foreground group-hover:bg-red-500/5 group-hover:text-red-400"
                    )}>
                      <Heart size={20} className={cn(isLiked && "fill-current")} />
                    </div>
                    <span className={cn(
                      "text-xs font-bold transition-colors",
                      isLiked ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {likeCount}
                    </span>
                  </button>

                  <button className="flex items-center gap-2 group transition-colors">
                    <div className="p-2 rounded-full bg-white/5 text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-all">
                      <MessageSquare size={20} />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                      0
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-muted-foreground opacity-20" />
            </div>
            <h4 className="font-bold text-lg mb-1">No moments yet</h4>
            <p className="text-xs text-muted-foreground">Be the first to share something with the world!</p>
          </div>
        )}
      </div>

      <Button 
        onClick={() => router.push('/moments/create')}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 z-30 transition-transform active:scale-90"
        size="icon"
      >
        <Plus size={24} />
      </Button>
    </div>
  );
}