import { Search, MessageCircleQuestion, HelpCircle, Bell, MessageCircle, LogOut, Activity, Settings, LifeBuoy } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/shadcn/dropdown-menu';
import type { TraceProfile } from '@/hooks/useTraceUser';

export default function Header({ profile, title }: { profile: TraceProfile | null; title: string }) {
  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase();
  const navigate = useNavigate();

  return (
    <header className="bg-surface border-b border-border py-3 px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Activity size={16} className="text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">TRACE</span>
        </div>

        <div className="w-px h-6 bg-border shrink-0" />

        <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-lg bg-background border border-border text-sm text-muted-foreground w-56">
          <Search size={14} />
          <span className="flex-1">Search...</span>
          <kbd className="text-[10px] border border-border rounded px-1 py-0.5">⌘K</kbd>
        </div>

        <button className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors">
          <MessageCircleQuestion size={14} />
          Feedback
        </button>

        <button
          aria-label="Help"
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-background"
        >
          <HelpCircle size={16} />
        </button>
        <button
          aria-label="Notifications"
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-background"
        >
          <Bell size={16} />
        </button>
        <button
          aria-label="Chat"
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-background"
        >
          <MessageCircle size={16} />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Avatar>
                <AvatarFallback>{initials || '?'}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings size={14} /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LifeBuoy size={14} /> Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void supabase.auth.signOut()}>
              <LogOut size={14} /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
