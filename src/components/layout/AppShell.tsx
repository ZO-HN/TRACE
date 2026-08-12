import { useMemo } from 'react';
import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useTraceUser, type TraceProfile } from '@/hooks/useTraceUser';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import { nav } from '@/config/nav';
import Dock from './Dock';
import Header from './Header';
import CopilotFab from '@/components/copilot/CopilotFab';

export interface AppShellContext {
  profile: TraceProfile;
}

export function useProfile(): TraceProfile {
  return useOutletContext<AppShellContext>().profile;
}

function usePageTitle(): string {
  const { pathname } = useLocation();

  return useMemo(() => {
    const all = [...nav.top, ...nav.sections.flatMap((s) => s.items)];
    return all.find((item) => item.path === pathname)?.label ?? 'Dashboard';
  }, [pathname]);
}

export default function AppShell() {
  const { isLoading, error, profile } = useTraceUser();
  const title = usePageTitle();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">Session Error</h2>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => (window.location.href = '/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== 'coach') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">This is the coach dashboard</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your account ({profile.email}) isn't a coach account. If you're a trainee, use the TRACE mobile app
            instead. If you were expecting coach access, ask your platform admin to add your email to the coach
            allowlist.
          </p>
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <Header profile={profile} title={title} />
      <main className="flex-1 min-w-0 pb-[120px]">
        <Outlet context={{ profile } satisfies AppShellContext} />
      </main>
      <Dock />
      <CopilotFab userId={profile.id} />
    </div>
  );
}
