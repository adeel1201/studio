"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useZynqoAuth } from '@/context/AuthContext';
import { useFirestore, useStorage } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Camera, Sparkles, User, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", 
  "Germany", "France", "Japan", "Brazil", "India", "Nigeria"
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, profile } = useZynqoAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      setProfilePic(URL.createObjectURL(file));
    }
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;

    setIsSubmitting(true);
    let photoUrl = profile?.profilePhoto || `https://picsum.photos/seed/${user.uid}/200/200`;

    try {
      // 1. Upload photo if changed
      if (profileFile && storage) {
        const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, profileFile);

        // Wait for upload
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            reject,
            async () => {
              photoUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(true);
            }
          );
        });
      }

      // 2. Update user profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        bio,
        country,
        profilePhoto: photoUrl,
        setupComplete: true,
        updatedAt: new Date()
      });

      toast({ title: "Profile setup complete!", description: "Welcome to Zynqo." });
      router.push('/chats');
    } catch (err) {
      toast({ title: "Setup failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] p-6 animate-fade-in pb-10">
      <header className="py-4 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground rounded-full">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="text-xl font-headline font-bold ml-2">Complete Profile</h2>
      </header>

      <div className="flex-1 mt-6 space-y-8">
        <div className="space-y-2">
          <h3 className="text-3xl font-headline font-bold flex items-center gap-2">
            Personalize <Sparkles className="text-primary" size={24} />
          </h3>
          <p className="text-muted-foreground text-sm">Tell the world a bit about yourself</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-primary/20 p-1 bg-white/5">
              <AvatarImage src={profilePic || profile?.profilePhoto || ''} />
              <AvatarFallback className="bg-transparent text-primary/40">
                <User size={64} />
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-1 right-1 bg-primary text-white p-2.5 rounded-full cursor-pointer shadow-xl shadow-primary/30 hover:scale-110 transition-transform">
              <Camera size={20} />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange} 
              />
            </label>
          </div>
          {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full max-w-[200px] space-y-2">
              <Progress value={uploadProgress} className="h-1" />
              <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">Uploading Photo...</p>
            </div>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Required</span>
        </div>

        <form className="space-y-6" onSubmit={handleFinish}>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Short Bio</Label>
            <Textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Design enthusiast, traveler, and coffee lover..." 
              className="min-h-[120px] bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary p-4"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Location / Country</Label>
            <Select onValueChange={setCountry} value={country}>
              <SelectTrigger className="h-14 bg-white/5 border-white/5 rounded-2xl focus:ring-primary px-4">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {COUNTRIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button 
              type="submit"
              disabled={isSubmitting || !bio || !country}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/20"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Finish Setup"}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4 font-medium italic opacity-60">You can update these later in settings</p>
          </div>
        </form>
      </div>
    </div>
  );
}
