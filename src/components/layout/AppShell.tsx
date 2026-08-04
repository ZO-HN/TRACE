import { Outlet, useOutletContext } from 'react-router';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useTraceUser, type TraceProfile } from '@/hooks/useTraceUser';
import Button from '@/components/ui/Button';
import Sidebar from './Sidebar';
import Header from './Header';
import CopilotFab from '@/components/copilot/CopilotFab';

export interface AppShellContext {
  profile: TraceProfile;
}

export function useProfile(): TraceProfile {
  return useOutletContext<AppShellContext>().profile;
}

export default function AppShell() {
  const { isLoading, error, profile } = useTraceUser();

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

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">Session Error</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error?.message ?? 'Could not load your profile. Please sign in again.'}
          </p>
          <Button onClick={() => (window.location.href = '/auth/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header profile={profile} />
        <main className="flex-1 min-w-0">
          <Outlet context={{ profile } satisfies AppShellContext} />
        </main>
      </div>
      <CopilotFab userId={profile.id} />
    </div>
  );
}
