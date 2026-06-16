"use client";

import { AppHeader } from '@/components/zynqo/AppHeader';
import { useAuth as useZynqoAuth } from '@/context/AuthContext';
import { useAuth, useFirestore } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Settings, 
  Lock, 
  Bell, 
  Database, 
  HelpCircle, 
  LogOut, 
  Edit3,
  Globe,
  QrCode,
  Loader2,
  MapPin,
  Calendar
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile, loading } = useZynqoAuth();
  const auth = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0E0C12]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/welcome');
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col animate-fade-in bg-[#0E0C12] min-h-screen pb-24">
      <AppHeader title="Profile" showActions={false} showSearch={false} />
      
      <div className="relative h-72 w-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-end justify-center pb-8 border-b border-white/10">
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="ghost" size="icon" className="bg-black/20 backdrop-blur-md rounded-2xl text-white">
            <QrCode size={20} />
          </Button>
          <Link href="/profile/edit">
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-black/20 backdrop-blur-md rounded-2xl text-white"
            >
              <Edit3 size={20} />
            </Button>
          </Link>
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-background shadow-2xl">
              <AvatarImage src={profile.profilePhoto} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">
                {profile.displayName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-2 right-2 w-7 h-7 border-4 border-background rounded-full shadow-lg ${profile.onlineStatus === 'online' ? 'bg-green-500' : 'bg-muted'}`} />
          </div>
          <div className="text-center px-6">
            <h2 className="text-2xl font-headline font-bold">{profile.displayName}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs text-primary font-bold tracking-widest uppercase">@{profile.username}</span>
              {profile.country && (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin size={10} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{profile.country}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-6 -mt-8 z-10">
        {[
          { label: 'Followers', value: '0' },
          { label: 'Following', value: '0' },
          { label: 'Z-Score', value: '100' }
        ].map((stat, i) => (
          <div key={i} className="bg-card/80 backdrop-blur-xl p-4 rounded-3xl border border-white/5 flex flex-col items-center shadow-lg">
            <span className="text-lg font-headline font-bold text-foreground">{stat.value}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="px-6 pb-6 space-y-8">
        {profile.bio && (
          <div className="bg-card/30 p-5 rounded-[2rem] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <User size={40} />
            </div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">About Me</h4>
            <p className="text-sm leading-relaxed text-muted-foreground italic">
              "{profile.bio}"
            </p>
            <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              <Calendar size={12} />
              <span>Joined {formatLastSeen(profile.createdAt)}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Account Settings</h4>
          <div className="bg-card/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
            <ProfileMenuItem icon={User} label="Personal Information" />
            <ProfileMenuItem icon={Globe} label="Privacy & Visibility" />
            <ProfileMenuItem icon={Lock} label="Security & Verification" />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Preferences</h4>
          <div className="bg-card/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
            <ProfileMenuItem icon={Bell} label="Notifications" />
            <ProfileMenuItem icon={Database} label="Data & Storage" />
            <ProfileMenuItem icon={HelpCircle} label="Help & Support" />
          </div>
        </div>

        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className="w-full h-14 rounded-3xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-2 font-bold mb-4 border border-destructive/20"
        >
          <LogOut size={20} />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

function ProfileMenuItem({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary/80">
          <Icon size={20} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-muted-foreground text-lg opacity-30">›</span>
    </button>
  );
}
