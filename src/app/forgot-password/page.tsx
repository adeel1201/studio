
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Mail, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({
      title: "Reset link sent",
      description: "Please check your email for instructions."
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] p-6 animate-fade-in">
      <header className="py-4 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground rounded-full">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="text-xl font-headline font-bold ml-2">Recovery</h2>
      </header>

      <div className="flex-1 mt-12 space-y-8">
        <div className="space-y-2">
          <h3 className="text-3xl font-headline font-bold">Forgot Password</h3>
          <p className="text-muted-foreground text-sm">Enter your email and we'll send you a link to reset your password.</p>
        </div>

        {!submitted ? (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input placeholder="name@example.com" className="h-14 pl-12 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" required />
              </div>
            </div>

            <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/20">
              Send Instructions
            </Button>
          </form>
        ) : (
          <div className="bg-primary/10 border border-primary/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-4 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <Mail size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-lg">Check your inbox</h4>
              <p className="text-xs text-muted-foreground">We've sent recovery instructions to your email address.</p>
            </div>
            <Button variant="link" onClick={() => setSubmitted(false)} className="text-primary font-bold">Didn't receive email? Resend</Button>
          </div>
        )}
      </div>

      <div className="py-8">
        <Button variant="ghost" onClick={() => router.push('/login')} className="w-full h-14 rounded-2xl text-muted-foreground hover:text-white flex items-center justify-center gap-2">
          Back to Login
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
