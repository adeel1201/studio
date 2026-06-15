
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, User, Mail, Lock, Smartphone, Camera, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function SignUpPage() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] p-6 animate-fade-in">
      <header className="py-4 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground rounded-full">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="text-xl font-headline font-bold ml-2">Join Zynqo</h2>
      </header>

      <div className="flex-1 mt-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-3xl font-headline font-bold">Create Account</h3>
          <p className="text-muted-foreground text-sm">Start your social journey today</p>
        </div>

        {/* Profile Picture Upload Placeholder */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative group">
            <Avatar className="w-24 h-24 border-2 border-dashed border-primary/40 p-1">
              <AvatarImage src={profilePic || ''} />
              <AvatarFallback className="bg-white/5">
                <User size={32} className="text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer shadow-lg shadow-primary/20 hover:scale-110 transition-transform">
              <Camera size={16} />
              <input type="file" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setProfilePic(URL.createObjectURL(file));
              }} />
            </label>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upload Avatar</p>
        </div>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); router.push('/profile-setup'); }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Username</Label>
              <div className="relative">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input placeholder="alex_z" className="h-12 pl-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Display Name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input placeholder="Alex Rivers" className="h-12 pl-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input type="email" placeholder="name@example.com" className="h-12 pl-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Phone Number</Label>
            <div className="relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input placeholder="+1 234 567 890" className="h-12 pl-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input type="password" placeholder="••••••••" className="h-12 pl-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" />
            </div>
          </div>

          <div className="pt-4">
            <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/20">
              Create Account
            </Button>
          </div>
        </form>
      </div>

      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground font-medium">
          Already have an account? {' '}
          <Button variant="link" onClick={() => router.push('/login')} className="text-primary font-bold p-0 h-auto">Login</Button>
        </p>
      </div>
    </div>
  );
}
