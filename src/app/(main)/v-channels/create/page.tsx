"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useStorage, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, query, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Send, Loader2, X, ChevronLeft, PlayCircle } from 'lucide-react';
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
  const [targetChannelId, setTargetChannelId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myChannelsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'creatorChannels'), where('creatorId', '==', user.uid));
  }, [db, user?.uid]);

  const { data: myChannels = [], loading: channelsLoading } = useCollection(myChannelsQuery);

  useEffect(() => {
    if (!channelsLoading && myChannels.length === 0) {
      toast({ title: "Setup Required", description: "You need a channel profile to post broadcasts." });
      router.replace('/v-channels/setup');
    } else if (myChannels.length > 0 && !targetChannelId) {
      setTargetChannelId(myChannels[0].id);
    }
  }, [myChannels, channelsLoading, router, toast, targetChannelId]);

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
    if (!user || !db || !targetChannelId || (!selectedFile && !caption.trim())) return;

    if (!storage) {
      console.error("Firebase Storage not initialized. Check your environment variables.");
      toast({ title: "Configuration Error", description: "Storage service is unavailable.", variant: "destructive" });
      return;
    }

    const channel = myChannels.find(c => c.id === targetChannelId);
    if (!channel) return;

    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      let mediaUrl = '';
      let mediaType = 'text';

      if (selectedFile) {
        console.log("Starting upload for file:", selectedFile.name, "Size:", selectedFile.size);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `v-channels/${user.uid}/${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, fileName);
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload progress: ${progress.toFixed(2)}%`);
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Storage upload task error:", error);
              reject(error);
            },
            () => {
              console.log("Upload completed successfully.");
              resolve(true);
            }
          );
        });

        mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
        mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      }

      await addDoc(collection(db, 'creatorPosts'), {
        creatorId: channel.id,
        creatorName: channel.name,
        creatorAvatar: channel.avatar,
        privacy: channel.privacy || 'public',
        type: mediaType,
        mediaUrl,
        caption: caption.trim(),
        likes: [],
        likeCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewCount: 0,
        timestamp: serverTimestamp()
      });

      toast({ title: "Broadcast Shared!", description: "Your update is now live on Channels." });
      router.push('/v-channels');
    } catch (err: any) {
      console.error("Full error object during broadcast creation:", err);
      toast({ title: "Broadcast Failed", description: err.message || "An unknown error occurred during upload.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (channelsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (myChannels.length === 0) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background animate-fade-in pb-10 text-foreground">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl safe-top px-4 h-16 flex items-center border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground mr-2">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="font-bold text-lg text-foreground">Create Broadcast</h2>
      </header>

      <form onSubmit={handleUpload} className="p-6 space-y-8">
        <div className="space-y-4">
           {!previewUrl ? (
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="aspect-[9/16] w-full max-w-sm mx-auto flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2.5rem] bg-muted/30 cursor-pointer hover:bg-muted transition-all gap-4 shadow-sm"
             >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Video size={32} />
                </div>
                <div className="text-center px-6">
                  <p className="font-bold text-sm text-foreground">Tap to add Media</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">Optional: Video, Image, or Text</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="video/*,image/*" className="hidden" />
             </div>
           ) : (
             <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-[2.5rem] overflow-hidden bg-black/5 border border-border shadow-lg group">
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
             <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Post To Channel</label>
             <Select value={targetChannelId} onValueChange={setTargetChannelId}>
                <SelectTrigger className="h-14 bg-muted border-border rounded-2xl focus:ring-primary px-4">
                   <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border">
                   {myChannels.map(c => (
                     <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                           <PlayCircle size={14} className="text-primary" />
                           <span className="font-bold text-foreground">{c.name}</span>
                        </div>
                     </SelectItem>
                   ))}
                </SelectContent>
             </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Broadcast Message</label>
            <Textarea 
              placeholder="What's on your mind?..." 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[120px] bg-muted border-border rounded-2xl focus-visible:ring-primary p-4 text-sm resize-none text-foreground"
              required={!selectedFile}
            />
          </div>

          {isSubmitting ? (
            <div className="space-y-3">
              <Progress value={uploadProgress} className="h-2 bg-muted" />
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">
                Publishing... {Math.round(uploadProgress)}%
              </p>
            </div>
          ) : (
            <Button 
              type="submit"
              disabled={!selectedFile && !caption.trim()}
              className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-transform active:scale-95 text-white"
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
