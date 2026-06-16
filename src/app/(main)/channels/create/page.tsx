
"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ChevronLeft, Loader2, Radio, Globe, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFirestore, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

export default function CreateChannelPage() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [channelPhoto, setChannelPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'public'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setChannelPhoto(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !formData.name.trim()) return;

    setIsLoading(true);
    let photoUrl = channelPhoto || `https://picsum.photos/seed/${Date.now()}/200/200`;

    try {
      if (photoFile && storage) {
        const storageRef = ref(storage, `channels/photos/${Date.now()}_${photoFile.name}`);
        const uploadTask = await uploadBytesResumable(storageRef, photoFile);
        photoUrl = await getDownloadURL(uploadTask.ref);
      }

      const channelData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        photo: photoUrl,
        type: formData.type,
        adminIds: [user.uid],
        followerIds: [user.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastPost: {
          content: 'Channel created',
          timestamp: serverTimestamp()
        }
      };

      const docRef = await addDoc(collection(db, 'channels'), channelData);
      
      toast({ title: "Channel Created!", description: `Broadcast your voice in ${formData.name}` });
      router.push(`/channels/${docRef.id}`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create channel.", variant: "destructive" });
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
        <h2 className="font-bold text-lg">New Channel</h2>
      </header>

      <div className="p-6 space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <Avatar className="w-32 h-32 border-4 border-primary/20 bg-white/5 rounded-[2rem]">
              <AvatarImage src={channelPhoto || ''} />
              <AvatarFallback className="bg-transparent text-primary/40">
                <Radio size={64} />
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-1 right-1 bg-primary text-white p-2.5 rounded-full cursor-pointer shadow-xl shadow-primary/30 hover:scale-110 transition-transform">
              <Camera size={20} />
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
            </label>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Channel Avatar</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Channel Name</Label>
            <Input 
              placeholder="e.g., Daily Tech News" 
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className="h-14 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Visibility</Label>
            <Select value={formData.type} onValueChange={(val) => setFormData(p => ({ ...p, type: val }))}>
              <SelectTrigger className="h-14 bg-white/5 border-white/5 rounded-2xl focus:ring-primary px-4">
                <div className="flex items-center gap-3">
                  {formData.type === 'public' ? <Globe size={18} className="text-primary" /> : <Lock size={18} className="text-muted-foreground" />}
                  <SelectValue placeholder="Select visibility" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                <SelectItem value="public">
                   <div className="flex flex-col gap-0.5">
                     <span className="font-bold">Public</span>
                     <span className="text-[9px] text-muted-foreground">Anyone can find and join</span>
                   </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Private</span>
                    <span className="text-[9px] text-muted-foreground">Only invited members can join</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Description (Optional)</Label>
            <Textarea 
              placeholder="What will you broadcast?" 
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              className="min-h-[120px] bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary p-4"
            />
          </div>

          <div className="pt-4">
            <Button 
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/20"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Create Channel"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
