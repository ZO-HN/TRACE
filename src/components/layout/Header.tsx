import { PanelLeft, Search, MessageCircleQuestion, HelpCircle, Bell, MessageCircle, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import type { TraceProfile } from '@/hooks/useTraceUser';

export default function Header({
  profile,
  title,
  collapsed,
  onToggleCollapsed,
}: {
  profile: TraceProfile | null;
  title: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <header className="bg-surface border-b border-border py-3 px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-background shrink-0"
        >
          <PanelLeft size={18} />
        </button>
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

        <Avatar>
          <AvatarFallback>{initials || '?'}</AvatarFallback>
        </Avatar>
        <span className="hidden md:inline text-sm text-muted-foreground">
          {profile?.first_name} {profile?.last_name}
        </span>
        <button
          onClick={() => void supabase.auth.signOut()}
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-background"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
