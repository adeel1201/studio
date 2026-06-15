
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Mail, Lock, Smartphone, Facebook } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0C12] p-6 animate-fade-in">
      <header className="py-4 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground rounded-full">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="text-xl font-headline font-bold ml-2">Welcome Back</h2>
      </header>

      <div className="flex-1 mt-8 space-y-8">
        <div className="space-y-2">
          <h3 className="text-3xl font-headline font-bold">Login</h3>
          <p className="text-muted-foreground text-sm">Sign in to continue your journey</p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          <button 
            onClick={() => setLoginMethod('email')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${loginMethod === 'email' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`}
          >
            Email
          </button>
          <button 
            onClick={() => setLoginMethod('phone')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${loginMethod === 'phone' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground'}`}
          >
            Phone
          </button>
        </div>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); router.push('/chats'); }}>
          {loginMethod === 'email' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input id="email" placeholder="name@example.com" className="h-14 pl-12 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest opacity-70">Password</Label>
                  <Button variant="link" size="sm" onClick={() => router.push('/forgot-password')} className="text-primary text-[10px] font-bold p-0 h-auto">Forgot Password?</Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input id="password" type="password" placeholder="••••••••" className="h-14 pl-12 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Phone Number</Label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input id="phone" placeholder="+1 234 567 890" className="h-14 pl-12 bg-white/5 border-white/5 rounded-2xl focus-visible:ring-primary" />
                </div>
              </div>
            </div>
          )}

          <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-lg shadow-lg shadow-primary/20">
            Login
          </Button>
        </form>

        <div className="space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="bg-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-[#0E0C12] px-4 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-14 rounded-2xl bg-white/5 border-white/5 hover:bg-white/10 font-bold text-sm">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </Button>
            <Button variant="outline" className="h-14 rounded-2xl bg-white/5 border-white/5 hover:bg-white/10 font-bold text-sm">
              <Facebook className="mr-2 h-4 w-4 text-[#1877F2]" fill="currentColor" />
              Facebook
            </Button>
          </div>
        </div>
      </div>

      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground font-medium">
          Don't have an account? {' '}
          <Button variant="link" onClick={() => router.push('/signup')} className="text-primary font-bold p-0 h-auto">Sign Up</Button>
        </p>
      </div>
    </div>
  );
}
