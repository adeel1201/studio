"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, User, Mail, Lock, Camera, UserCircle, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit button clicked, starting sign-up process...");
    
    const { email, password, confirmPassword, username, displayName } = formData;

    if (!auth || !db) {
      console.error("Firebase services not initialized");
      toast({
        title: "Configuration Error",
        description: "Firebase services are not yet available.",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    console.log("Attempting to create user with email:", email);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Auth user created successfully:", user.uid);

      // Create user profile in Firestore
      console.log("Creating Firestore profile for user:", user.uid);
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username.toLowerCase(),
        displayName,
        email: email.toLowerCase(),
        profilePhoto: profilePic || `https://picsum.photos/seed/${user.uid}/200/200`,
        bio: '',
        onlineStatus: 'online',
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      console.log("Firestore profile created successfully.");

      toast({
        title: "Welcome to Zynqo!",
        description: "Account created successfully.",
      });

      router.push('/profile-setup');
    } catch (error: any) {
      console.error("Signup error caught:", error);
      let message = "Failed to create account.";
      if (error.code === 'auth/email-already-in-use') message = "This email is already registered.";
      if (error.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
      if (error.code === 'permission-denied') message = "Firestore permission denied. Check your security rules.";
      
      toast({
        title: "Sign Up Failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] p-6 animate-fade-in">
      <header className="py-4 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground rounded-full">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="text-xl font-headline font-bold ml-2">Join Zynqo</h2>
      </header>

      <div className="flex-1 mt-6 space-y-6 overflow-y-auto no-scrollbar pb-8">
        <div className="space-y-2">
          <h3 className="text-3xl font-headline font-bold">Create Account</h3>
          <p className="text-muted-foreground text-sm">Start your social journey today</p>
        </div>

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

        <form className="space-y-4" onSubmit={handleSignUp}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Username</Label>
              <div className="relative">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input name="username" value={formData.username} onChange={handleChange} placeholder="alex_z" className="h-12 pl-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Display Name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input name="displayName" value={formData.displayName} onChange={handleChange} placeholder="Alex Rivers" className="h-12 pl-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" required />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" className="h-12 pl-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className="h-12 pl-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="h-12 pl-10 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" required />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/20"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Create Account"}
            </Button>
          </div>
        </form>
      </div>

      <div className="py-8 text-center bg-[#0E0C12] sticky bottom-0">
        <p className="text-sm text-muted-foreground font-medium">
          Already have an account? {' '}
          <Button variant="link" onClick={() => router.push('/login')} className="text-primary font-bold p-0 h-auto">Login</Button>
        </p>
      </div>
    </div>
  );
}