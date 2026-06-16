
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
  Loader2
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, profile, loading } = useZynqoAuth();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  const [editData, setEditData] = useState({
    displayName: '',
    bio: '',
    profilePhoto: ''
  });

  useEffect(() => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        profilePhoto: profile.profilePhoto || ''
      });
    }
  }, [profile]);

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

  const handleSaveProfile = async () => {
    if (!db || !user) return;
    setEditLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: editData.displayName,
        bio: editData.bio,
        profilePhoto: editData.profilePhoto
      });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive"
      });
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="flex flex-col animate-fade-in bg-[#0E0C12]">
      <AppHeader title="Profile" showActions={false} showSearch={false} />
      
      <div className="relative h-64 w-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-end justify-center pb-8 border-b border-white/10">
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="ghost" size="icon" className="bg-black/20 backdrop-blur-md rounded-2xl text-white">
            <QrCode size={20} />
          </Button>
          
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-black/20 backdrop-blur-md rounded-2xl text-white"
              >
                <Edit3 size={20} />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-foreground rounded-[2rem] max-w-[90vw] sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="font-headline text-xl font-bold">Edit Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto no-scrollbar px-1">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold opacity-70">Profile Photo URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={editData.profilePhoto}
                      onChange={(e) => setEditData(prev => ({ ...prev, profilePhoto: e.target.value }))}
                      className="bg-white/5 border-white/5 h-12 rounded-xl text-xs"
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold opacity-70">Display Name</Label>
                  <Input 
                    value={editData.displayName}
                    onChange={(e) => setEditData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="bg-white/5 border-white/5 h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold opacity-70">Bio</Label>
                  <Textarea 
                    value={editData.bio}
                    onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                    className="bg-white/5 border-white/5 rounded-xl min-h-[100px]"
                    placeholder="Tell your story..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={editLoading}
                  className="w-full bg-primary hover:bg-primary/90 rounded-xl h-12 font-bold shadow-lg shadow-primary/20"
                >
                  {editLoading ? <Loader2 className="animate-spin" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="w-28 h-28 border-4 border-background shadow-2xl">
              <AvatarImage src={profile.profilePhoto} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                {profile.displayName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-background rounded-full shadow-lg" />
          </div>
          <div className="text-center px-6">
            <h2 className="text-xl font-headline font-bold">{profile.displayName}</h2>
            <p className="text-xs text-primary font-medium tracking-widest uppercase mt-0.5">@{profile.username}</p>
            {profile.bio && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 max-w-[250px] italic">
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-6 -mt-6 z-10">
        {[
          { label: 'Friends', value: '0' },
          { label: 'Moments', value: '0' },
          { label: 'Score', value: '0' }
        ].map((stat, i) => (
          <div key={i} className="bg-card/80 backdrop-blur-xl p-4 rounded-3xl border border-white/5 flex flex-col items-center shadow-lg">
            <span className="text-lg font-headline font-bold text-foreground">{stat.value}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="px-6 pb-6 space-y-6">
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Account</h4>
          <div className="bg-card/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
            <ProfileMenuItem icon={User} label="Personal Information" />
            <ProfileMenuItem icon={Globe} label="Privacy & Visibility" />
            <ProfileMenuItem icon={Lock} label="Security & Verification" />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">App Settings</h4>
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
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-primary/80">
          <Icon size={18} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-muted-foreground text-lg">›</span>
    </button>
  );
}
