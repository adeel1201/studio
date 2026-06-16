
"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useStorage } from '@/firebase';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, Camera, Loader2, PlayCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

export default function SetupChannelPage() {
  const { user, profile } = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !formData.name.trim() || !formData.username.trim()) return;

    setIsLoading(true);
    let avatarUrl = previewAvatar || profile?.profilePhoto || `https://picsum.photos/seed/${user.uid}/200/200`;

    try {
      if (avatarFile && storage) {
        setIsUploading(true);
        const storageRef = ref(storage, `channels/avatars/${user.uid}_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, avatarFile);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            reject,
            async () => {
              avatarUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(true);
            }
          );
        });
        setIsUploading(false);
      }

      const channelRef = doc(db, 'creatorChannels', user.uid);
      await setDoc(channelRef, {
        creatorId: user.uid,
        name: formData.name.trim(),
        username: formData.username.toLowerCase().trim(),
        bio: formData.bio.trim(),
        avatar: avatarUrl,
        followerCount: 0,
        followingCount: 0,
        totalLikes: 0,
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Also ensure user doc has followingCount
      await updateDoc(doc(db, 'users', user.uid), {
        followingCount: 0
      }).catch(() => {});

      toast({ title: "Channel Created!", description: "Welcome to the Zynqo creator community." });
      router.push(`/v-channels/${user.uid}`);
    } catch (error: any) {
      toast({ title: "Failed to create channel", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] animate-fade-in pb-10">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl safe-top px-2 h-16 flex items-center border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground mr-2">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="font-bold text-lg">Setup Channel</h2>
      </header>

      <div className="p-6 space-y-8">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
            <Sparkles size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-headline font-bold">Start Your Broadcast</h3>
            <p className="text-sm text-muted-foreground leading-relaxed px-4">Create your unique creator persona and start sharing with the Zynqo community.</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-2xl bg-card">
              <AvatarImage src={previewAvatar || profile?.profilePhoto || ''} />
              <AvatarFallback className="bg-white/5 text-primary/40 text-3xl">
                <PlayCircle size={48} />
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-1 right-1 bg-primary text-white p-2.5 rounded-full cursor-pointer shadow-xl shadow-primary/30 hover:scale-110 transition-transform">
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handlePhotoSelect}
                disabled={isLoading}
              />
            </label>
          </div>
          {isUploading && (
            <div className="w-full max-w-[150px] space-y-1">
              <Progress value={uploadProgress} className="h-1" />
              <p className="text-[8px] text-center text-muted-foreground uppercase font-bold tracking-widest">Uploading Avatar...</p>
            </div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Channel Branding</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Channel Name</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Midnight Vibes"
              className="h-14 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Handle (@username)</Label>
            <Input 
              value={formData.username}
              onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
              placeholder="unique_handle" 
              className="h-14 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Channel Bio</Label>
            <Textarea 
              value={formData.bio}
              onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
              placeholder="What will you share with the world?" 
              className="min-h-[120px] bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary p-4 resize-none"
            />
          </div>

          <div className="pt-4">
            <Button 
              type="submit"
              disabled={isLoading || isUploading || !formData.name.trim() || !formData.username.trim()}
              className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : (
                <>
                  <Sparkles size={20} />
                  Establish Channel
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
