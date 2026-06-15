"use client";

import { Search, Camera, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppHeaderProps {
  title: string;
  showSearch?: boolean;
  showActions?: boolean;
  onSearchClick?: () => void;
}

export function AppHeader({ title, showSearch = true, showActions = true, onSearchClick }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full glass-morphism safe-top px-4 h-[72px] flex items-center justify-between">
      <h1 className="text-2xl font-headline font-bold text-foreground bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        {title}
      </h1>
      
      <div className="flex items-center gap-1">
        {showSearch && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onSearchClick}
            className="text-muted-foreground hover:text-foreground"
          >
            <Search size={22} />
          </Button>
        )}
        {showActions && (
          <>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Camera size={22} />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <MoreVertical size={22} />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}