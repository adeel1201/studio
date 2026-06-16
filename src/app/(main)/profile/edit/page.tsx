"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useZynqoAuth } from '@/context/AuthContext';
import { useFirestore, useStorage } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Camera, Loader2, Save, AtSign, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", 
  "Germany", "France", "Japan", "Brazil", "India", "Nigeria"
];

export default function EditProfilePage() {
  const { user, profile, loading } = useZynqoAuth();
  const db = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    bio: '',
    country: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        username: profile.username || '',
        bio: profile.bio || '',
        country: profile.country || ''
      });
    }
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0E0C12]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage || !db) return;

    setIsUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}`);
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
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { profilePhoto: downloadURL });
        setIsUploading(false);
        toast({ title: "Profile photo updated" });
      }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        username: formData.username.toLowerCase().trim(),
        bio: formData.bio,
        country: formData.country,
        updatedAt: new Date()
      });
      toast({ title: "Profile saved successfully" });
      router.back();
    } catch (error: any) {
      toast({ title: "Failed to save profile", variant: "destructive" });
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
          <h2 className="font-bold text-lg">Edit Profile</h2>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleSave} 
          disabled={isSaving}
          className="text-primary font-bold uppercase tracking-widest text-xs"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Save"}
        </Button>
      </header>

      <div className="p-6 space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-primary/10 shadow-xl">
              <AvatarImage src={profile.profilePhoto} />
              <AvatarFallback className="bg-white/5 text-primary/40 text-3xl">
                {profile.displayName?.[0]}
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
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Full Name</Label>
            <Input 
              value={formData.displayName}
              onChange={(e) => setFormData(p => ({ ...p, displayName: e.target.value }))}
              placeholder="Your full name" 
              className="h-14 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Username</Label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input 
                value={formData.username}
                onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
                placeholder="username" 
                className="h-14 pl-12 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Country</Label>
            <Select 
              value={formData.country} 
              onValueChange={(val) => setFormData(p => ({ ...p, country: val }))}
            >
              <SelectTrigger className="h-14 bg-white/5 border-white/5 rounded-2xl focus:ring-primary px-4">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-muted-foreground" />
                  <SelectValue placeholder="Where are you from?" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Bio</Label>
            <Textarea 
              value={formData.bio}
              onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
              placeholder="Tell us something interesting..." 
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
