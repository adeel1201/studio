
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useStorage, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Video, Send, Loader2, X, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';

export default function CreateChannelPostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if channel exists, if not redirect to setup
  const channelRef = useMemoFirebase(() => (user?.uid && db) ? doc(db, 'creatorChannels', user.uid) : null, [db, user?.uid]);
  const { data: channel, loading: channelLoading } = useDoc(channelRef);

  useEffect(() => {
    if (!channelLoading && !channel) {
      toast({ title: "Setup Required", description: "You need a channel profile to post broadcasts." });
      router.replace('/v-channels/setup');
    }
  }, [channel, channelLoading, router, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "File too large", description: "Media must be under 50MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !channel || (!selectedFile && !caption.trim())) return;

    setIsSubmitting(true);
    try {
      let mediaUrl = '';
      let mediaType = 'text';

      if (selectedFile && storage) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `v-channels/${user.uid}/${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, fileName);
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            reject,
            resolve
          );
        });

        mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
        mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      }

      await addDoc(collection(db, 'creatorPosts'), {
        creatorId: user.uid,
        creatorName: channel.name,
        creatorAvatar: channel.avatar,
        type: mediaType,
        mediaUrl,
        caption: caption.trim(),
        likes: [],
        likeCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        timestamp: serverTimestamp()
      });

      toast({ title: "Broadcast Shared!", description: "Your update is now live on Channels." });
      router.push('/v-channels');
    } catch (err: any) {
      toast({ title: "Broadcast Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (channelLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0E0C12]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!channel) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] animate-fade-in pb-10 text-white">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl safe-top px-4 h-16 flex items-center border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white mr-2">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="font-bold text-lg">Broadcast to Channels</h2>
      </header>

      <form onSubmit={handleUpload} className="p-6 space-y-8">
        <div className="space-y-4">
           {!previewUrl ? (
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="aspect-[9/16] w-full max-w-sm mx-auto flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] bg-white/5 cursor-pointer hover:bg-white/10 transition-all gap-4"
             >
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Video size={32} />
                </div>
                <div className="text-center px-6">
                  <p className="font-bold text-sm">Tap to add Media</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">Optional: Channels supports text-only broadcasts too</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="video/*,image/*" className="hidden" />
             </div>
           ) : (
             <div className="relative aspect-[9/16] w-full max-sm:w-full max-w-sm mx-auto rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 shadow-2xl group">
                {selectedFile?.type.startsWith('video/') ? (
                  <video src={previewUrl} className="w-full h-full object-contain" controls />
                ) : (
                  <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                )}
                <Button 
                  type="button" variant="ghost" size="icon" 
                  onClick={() => { setPreviewUrl(null); setSelectedFile(null); }}
                  className="absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-full text-white z-20"
                >
                  <X size={20} />
                </Button>
             </div>
           )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Broadcast Message</label>
            <Textarea 
              placeholder="What are you broadcasting today?..." 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[120px] bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary p-4 text-sm resize-none"
              required={!selectedFile}
            />
          </div>

          {isSubmitting ? (
            <div className="space-y-3">
              <Progress value={uploadProgress} className="h-2 bg-white/5" />
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">
                Broadcasting... {Math.round(uploadProgress)}%
              </p>
            </div>
          ) : (
            <Button 
              type="submit"
              disabled={!selectedFile && !caption.trim()}
              className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-transform active:scale-95"
            >
              <Send size={24} />
              Publish Broadcast
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
