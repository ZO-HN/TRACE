import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import type { TraceProfile } from '@/hooks/useTraceUser';

export default function Header({ profile }: { profile: TraceProfile | null }) {
  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <header className="bg-surface border-b border-border py-3 px-6 flex items-center justify-between">
      <h1 className="text-lg font-bold text-foreground">Coach Dashboard</h1>
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials || '?'}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">
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
