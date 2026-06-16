
"use client";

import { AppHeader } from '@/components/zynqo/AppHeader';
import { useAuth as useZynqoAuth } from '@/context/AuthContext';
import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
  ChevronRight,
  PlayCircle,
  Plus
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, profile, loading: authLoading } = useZynqoAuth();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // Fetch my channels
  const myChannelsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'creatorChannels'), where('creatorId', '==', user.uid));
  }, [db, user?.uid]);

  const { data: myChannels = [], loading: channelsLoading } = useCollection(myChannelsQuery);

  if (authLoading) {
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

  const handleCreateChannel = () => {
    if (myChannels.length >= 3) {
      toast({ 
        title: "Channel Limit Reached", 
        description: "You can create up to 3 channels per account.",
        variant: "destructive"
      });
      return;
    }
    router.push('/v-channels/setup');
  };

  const formatJoinedDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col animate-fade-in bg-[#0E0C12] min-h-screen pb-24">
      <AppHeader title="Me" showActions={false} showSearch={false} />
      
      {/* Personal Account Header */}
      <div className="p-6 flex items-center gap-4 bg-card/20 border-b border-white/5">
        <div className="relative">
          <Avatar className="w-20 h-20 border-2 border-primary/20 shadow-xl">
            <AvatarImage src={profile.profilePhoto} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
              {profile.displayName?.[0]}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-headline font-bold truncate">{profile.displayName}</h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">@{profile.username}</p>
          <Link href="/profile/edit" className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">
            <Edit3 size={12} />
            Edit Profile
          </Link>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground rounded-2xl bg-white/5">
          <QrCode size={20} />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Creator Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between ml-2">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Content Creator</h4>
            <span className="text-[10px] font-black text-primary/40">{myChannels.length}/3 Channels</span>
          </div>
          <div className="bg-card/40 rounded-[2rem] border border-white/5 overflow-hidden">
            {channelsLoading ? (
              <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-primary/30" size={20} /></div>
            ) : myChannels.length > 0 ? (
              <>
                {myChannels.map((channel: any) => (
                  <Link 
                    key={channel.id} 
                    href={`/v-channels/${channel.id}`}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10 rounded-xl border border-primary/20">
                        <AvatarImage src={channel.avatar} />
                        <AvatarFallback><PlayCircle size={20} /></AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{channel.name}</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-1.5">
                           {channel.privacy || 'public'} channel
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/30" />
                  </Link>
                ))}
                {myChannels.length < 3 && (
                  <button onClick={handleCreateChannel} className="w-full p-4 flex items-center gap-3 text-primary/60 hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest bg-primary/5">
                    <Plus size={14} /> Create Another Channel
                  </button>
                )}
              </>
            ) : (
              <button onClick={handleCreateChannel} className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Plus size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Create Video Channel</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Start sharing broadcasts</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground/30" />
              </button>
            )}
          </div>
        </section>

        {/* Account & Security */}
        <section className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Personal Settings</h4>
          <div className="bg-card/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
            <ProfileMenuItem icon={Settings} label="Application Settings" href="/settings" />
            <ProfileMenuItem icon={Globe} label="Privacy & Visibility" href="/settings/privacy" />
            <ProfileMenuItem icon={Bell} label="Notifications" href="/settings/notifications" />
            <ProfileMenuItem icon={Lock} label="Security & Account" href="/settings/security" />
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Support</h4>
          <div className="bg-card/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
            <ProfileMenuItem icon={HelpCircle} label="Help & Support" href="#" />
            <ProfileMenuItem icon={Database} label="Data & Storage" href="/settings/data" />
          </div>
        </section>

        <div className="pt-4 px-2">
          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="w-full h-14 rounded-[2rem] bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-2 font-bold border border-destructive/10 shadow-xl shadow-destructive/5"
          >
            <LogOut size={20} />
            Sign Out
          </Button>
          <p className="text-center text-[9px] text-muted-foreground mt-6 font-bold uppercase tracking-[0.3em] opacity-40">
            Zynqo Amethyst v1.2.0 • Joined {formatJoinedDate(profile.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileMenuItem({ icon: Icon, label, href }: { icon: any, label: string, href: string }) {
  return (
    <Link href={href} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-primary/80">
          <Icon size={20} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight size={16} className="text-muted-foreground/30" />
    </Link>
  );
}
