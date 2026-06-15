
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Camera, Sparkles, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] p-6 animate-fade-in">
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
              <AvatarImage src={profilePic || ''} />
              <AvatarFallback className="bg-transparent text-primary/40">
                <User size={64} />
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-1 right-1 bg-primary text-white p-2.5 rounded-full cursor-pointer shadow-xl shadow-primary/30 hover:scale-110 transition-transform">
              <Camera size={20} />
              <input type="file" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setProfilePic(URL.createObjectURL(file));
              }} />
            </label>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Required</span>
        </div>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); router.push('/chats'); }}>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Short Bio</Label>
            <Textarea 
              placeholder="Design enthusiast, traveler, and coffee lover..." 
              className="min-h-[120px] bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary p-4"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Location / Country</Label>
            <Select>
              <SelectTrigger className="h-14 bg-white/5 border-white/5 rounded-2xl focus:ring-primary px-4">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="au">Australia</SelectItem>
                <SelectItem value="de">Germany</SelectItem>
                <SelectItem value="jp">Japan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/20">
              Finish Setup
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4 font-medium italic opacity-60">You can update these later in settings</p>
          </div>
        </form>
      </div>
    </div>
  );
}
