
"use client";

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] p-6 animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
          <div className="relative w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/20 animate-pulse-soft">
            <Sparkles size={48} className="text-white" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-5xl font-headline font-bold tracking-tight bg-gradient-to-r from-primary via-white to-secondary bg-clip-text text-transparent">
            Zynqo
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-[0.4em] font-medium">
            Connect • Chat • Share • Discover
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 pb-12">
        <Button 
          size="lg" 
          className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20"
          onClick={() => router.push('/login')}
        >
          Login
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-lg"
          onClick={() => router.push('/signup')}
        >
          Sign Up
        </Button>
        
        <p className="text-[10px] text-center text-muted-foreground mt-4 px-8 leading-relaxed uppercase tracking-widest font-medium opacity-60">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
