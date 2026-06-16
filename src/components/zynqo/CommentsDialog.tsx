"use client";

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useAuth 
} from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface CommentsDialogProps {
  momentId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentsDialog({ momentId, isOpen, onOpenChange }: CommentsDialogProps) {
  const db = useFirestore();
  const { user, profile } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsQuery = useMemoFirebase(() => {
    if (!db || !momentId) return null;
    return query(
      collection(db, 'moments', momentId, 'comments'), 
      orderBy('createdAt', 'asc')
    );
  }, [db, momentId]);

  const { data: comments = [], loading } = useCollection(commentsQuery);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !commentText.trim()) return;

    setIsSubmitting(true);
    const commentData = {
      userId: user.uid,
      userName: profile?.displayName || user.displayName || 'Anonymous',
      userPhoto: profile?.profilePhoto || '',
      text: commentText.trim(),
      createdAt: serverTimestamp()
    };

    const commentsRef = collection(db, 'moments', momentId, 'comments');

    addDoc(commentsRef, commentData)
      .catch((err) => {
        const permissionError = new FirestorePermissionError({
          path: commentsRef.path,
          operation: 'create',
          requestResourceData: commentData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
        setCommentText('');
      });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!db || !momentId) return;
    const commentRef = doc(db, 'moments', momentId, 'comments', commentId);
    
    deleteDoc(commentRef).catch((err) => {
      const permissionError = new FirestorePermissionError({
        path: commentRef.path,
        operation: 'delete'
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/5 text-foreground sm:max-w-[425px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5">
          <DialogTitle className="font-headline font-bold">Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Loader2 className="animate-spin text-primary" size={20} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Loading comments...</p>
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment: any) => {
              const isMe = comment.userId === user?.uid;
              const date = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date();
              
              return (
                <div key={comment.id} className="flex gap-3 group animate-fade-in">
                  <Avatar className="w-8 h-8 border border-white/5 shrink-0">
                    <AvatarImage src={comment.userPhoto} />
                    <AvatarFallback>{comment.userName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-foreground">{comment.userName}</h5>
                      <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                        {formatDistanceToNow(date, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                      {comment.text}
                    </p>
                  </div>
                  {isMe && (
                    <button 
                      onClick={() => handleDeleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-xs text-muted-foreground italic">No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>

        <form onSubmit={handleAddComment} className="p-6 border-t border-white/5 bg-background/50">
          <div className="relative flex items-center gap-2">
            <Input 
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="h-12 bg-white/5 border-white/10 rounded-2xl focus-visible:ring-primary text-sm pr-12"
            />
            <Button 
              type="submit"
              size="icon"
              disabled={isSubmitting || !commentText.trim()}
              className="absolute right-1.5 h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}