
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useStorage, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, Camera, Loader2, Save, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

export default function EditChannelPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const channelRef = useMemoFirebase(() => (id && typeof id === 'string') ? doc(db, 'creatorChannels', id) : null, [db, id]);
  const { data: channel, loading } = useDoc(channelRef);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name || '',
        username: channel.username || '',
        bio: channel.bio || ''
      });
    }
  }, [channel]);

  if (loading || !channel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0E0C12]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  // Ensure only owner can edit
  if (user?.uid !== channel.creatorId) {
    router.push('/v-channels');
    return null;
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage || !db || !id) return;

    setIsUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `channels/avatars/${id}_${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        setIsUploading(false);
        toast({ title: "Upload failed", variant: "destructive" });
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await updateDoc(doc(db, 'creatorChannels', id as string), { avatar: downloadURL });
        setIsUploading(false);
        toast({ title: "Avatar updated" });
      }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !id) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'creatorChannels', id as string), {
        name: formData.name,
        username: formData.username.toLowerCase().trim(),
        bio: formData.bio,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Channel updated successfully" });
      router.back();
    } catch (error: any) {
      toast({ title: "Failed to save changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] animate-fade-in pb-10">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl safe-top px-2 h-16 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground mr-2">
            <ChevronLeft size={24} />
          </Button>
          <h2 className="font-bold text-lg">Edit Channel</h2>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleSave} 
          disabled={isSaving}
          className="text-primary font-bold uppercase tracking-widest text-xs"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Done"}
        </Button>
      </header>

      <div className="p-6 space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-2xl bg-card">
              <AvatarImage src={channel.avatar} />
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
                onChange={handlePhotoUpload}
                disabled={isUploading}
              />
            </label>
          </div>
          {isUploading && (
            <div className="w-full max-w-[150px] space-y-1">
              <Progress value={uploadProgress} className="h-1" />
              <p className="text-[8px] text-center text-muted-foreground uppercase font-bold tracking-widest">Uploading...</p>
            </div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Channel Avatar</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Channel Name</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="h-14 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Unique Handle</Label>
            <Input 
              value={formData.username}
              onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
              placeholder="username" 
              className="h-14 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Channel Bio</Label>
            <Textarea 
              value={formData.bio}
              onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
              placeholder="What is your channel about?" 
              className="min-h-[120px] bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary p-4"
            />
          </div>

          <div className="pt-4">
            <Button 
              type="submit"
              disabled={isSaving}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/20"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : (
                <>
                  <Save size={20} className="mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
