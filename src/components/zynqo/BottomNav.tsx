
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, CircleDot, Phone, LayoutGrid, Compass, User, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { icon: MessageSquare, label: 'Chats', path: '/chats' },
  { icon: CircleDot, label: 'Status', path: '/status' },
  { icon: Radio, label: 'Channels', path: '/channels' },
  { icon: LayoutGrid, label: 'Moments', path: '/moments' },
  { icon: Compass, label: 'Discover', path: '/discover' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-morphism safe-bottom max-w-md mx-auto border-t border-white/5 px-2">
      <div className="flex items-center justify-between h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.path) || (pathname === '/' && item.path === '/chats');
          const Icon = item.icon;

          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 transition-all duration-300 relative py-1",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                isActive && "bg-primary/10 shadow-[0_0_15px_rgba(159,95,245,0.2)]"
              )}>
                <Icon size={22} className={cn("transition-transform", isActive && "scale-110")} />
              </div>
              <span className="text-[10px] font-medium mt-1 uppercase tracking-wider">{item.label}</span>
              {isActive && (
                <div className="absolute -top-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
