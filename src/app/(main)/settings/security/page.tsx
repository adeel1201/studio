"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useZynqoAuth } from '@/context/AuthContext';
import { useAuth as useFirebaseAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ShieldCheck, 
  Mail, 
  Smartphone, 
  History, 
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user, profile } = useZynqoAuth();
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch Security Logs
  const logsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'securityLogs'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
  }, [db, user?.uid]);

  const { data: logs = [], loading: logsLoading } = useCollection(logsQuery);

  const handleVerifyEmail = async () => {
    if (!auth?.currentUser) return;
    setIsVerifying(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast({ title: "Verification link sent", description: "Please check your inbox." });
    } catch (err: any) {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const isEmailVerified = user?.emailVerified;

  return (
    <div className="flex flex-col min-h-screen bg-background animate-fade-in pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl safe-top px-2 h-16 flex items-center border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground mr-2">
          <ChevronLeft size={24} />
        </Button>
        <h2 className="font-bold text-lg text-foreground">Advanced Security</h2>
      </header>

      <div className="p-4 space-y-8">
        <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <ShieldCheck size={120} />
          </div>
          <div className={cn(
            "w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg",
            isEmailVerified ? "bg-green-500 text-white shadow-green-500/20" : "bg-yellow-500 text-white shadow-yellow-500/20"
          )}>
            <ShieldCheck size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Security Score: {isEmailVerified ? 'Excellent' : 'Action Required'}</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Protect your Zynqo account</p>
          </div>
        </div>

        <section className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-2">Protection Flow</h4>
          <div className="bg-card rounded-[2.5rem] border border-border divide-y divide-border overflow-hidden shadow-sm">
            
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-primary">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Email Verification</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{user?.email}</p>
                </div>
              </div>
              {isEmailVerified ? (
                <div className="flex items-center gap-1.5 bg-green-500/10 text-green-500 px-3 py-1 rounded-full border border-green-500/20">
                  <CheckCircle2 size={12} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">Verified</span>
                </div>
              ) : (
                <Button 
                  size="sm" variant="outline" 
                  onClick={handleVerifyEmail}
                  disabled={isVerifying}
                  className="rounded-xl border-primary/20 text-primary h-8 px-4 text-[9px] font-black uppercase tracking-widest"
                >
                  {isVerifying ? <Loader2 size={12} className="animate-spin" /> : "Verify Now"}
                </Button>
              )}
            </div>

            <button 
              onClick={() => router.push('/settings/security/mfa')}
              className="w-full p-5 flex items-center justify-between hover:bg-muted transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-primary">
                  <Smartphone size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Two-Factor Authentication</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Add an extra layer of security</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Setup</span>
                <ChevronLeft size={16} className="text-muted-foreground/30 rotate-180" />
              </div>
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <History size={16} className="text-primary" />
              <h3 className="font-headline font-bold text-lg text-foreground">Login Activity</h3>
            </div>
          </div>

          <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm">
            {logsLoading ? (
              <div className="p-10 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-primary" size={24} />
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Scanning logs...</p>
              </div>
            ) : logs.length > 0 ? (
              <div className="divide-y divide-border">
                {logs.map((log: any) => (
                  <div key={log.id} className="p-4 flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center",
                      log.status === 'success' ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                    )}>
                      {log.status === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold flex items-center gap-2 text-foreground">
                        {log.type === 'login' ? 'Successful Login' : 'Login Attempt'}
                        <span className="text-[9px] font-normal text-muted-foreground uppercase tracking-wider">• {log.deviceInfo || 'Unknown Device'}</span>
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                         <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                           {log.timestamp?.toDate ? formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true }) : 'Recently'}
                         </p>
                         <p className="text-[9px] text-muted-foreground/40 font-mono">{log.ipAddress || 'IP Hidden'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-xs text-muted-foreground">No recent activity detected.</p>
              </div>
            )}
          </div>
        </section>

        <div className="bg-muted/30 p-6 rounded-[2.5rem] border border-dashed border-border flex items-start gap-4">
           <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-muted-foreground shrink-0 shadow-sm">
              <AlertCircle size={24} />
           </div>
           <div className="space-y-2">
              <h4 className="text-sm font-bold text-foreground">Session Management</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                If you notice suspicious activity, you can sign out of all other sessions immediately.
              </p>
              <Button variant="link" className="text-primary p-0 h-auto text-[10px] font-bold uppercase tracking-widest">
                Sign out of all sessions
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}