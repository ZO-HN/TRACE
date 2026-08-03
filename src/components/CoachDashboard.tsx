import { motion } from 'framer-motion';
import { Dumbbell, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { useTraceUser } from '../hooks/useTraceUser';
import { useDeviceSize } from '../hooks/useDeviceSize';
import { supabase } from '../lib/supabase';
import AiBrainPanel from './chat/AiBrainPanel';
import AppControlCopilot from './chat/AppControlCopilot';
import RosterPanel from './coach/RosterPanel';
import TemplateBuilder from './coach/TemplateBuilder';
import Button from './ui/Button';

function Avatar({ firstName, lastName }: { firstName?: string; lastName?: string }) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">
      {initials || '?'}
    </div>
  );
}

// ==========================================
// Coach Dashboard — the only view in this app.
// Every account here is a coach (TRACE is now single-coach: clients live in
// the separate native app and are auto-enrolled to this coach on signup).
// ==========================================
export default function CoachDashboard() {
  const { isLoading, error, profile } = useTraceUser();
  const { isDesktop } = useDeviceSize();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error || (!isLoading && !profile)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Session Error</h2>
          <p className="text-sm text-gray-400 mb-4">
            {error?.message ?? 'Could not load your profile. Please sign in again.'}
          </p>
          <Button onClick={() => (window.location.href = '/auth/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-gray-100 font-sans">
      <header className="bg-surface border-b border-border py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Dumbbell size={16} className="text-primary" />
          </div>
          <h1 className="text-lg font-bold text-white">TRACE Coach</h1>
        </div>
        <div className="flex items-center gap-3">
          <Avatar firstName={profile?.first_name} lastName={profile?.last_name} />
          <span className="text-sm text-gray-400">
            {profile?.first_name} {profile?.last_name}
          </span>
          <button
            onClick={() => void supabase.auth.signOut()}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1.5 rounded-lg hover:bg-background"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`w-full mx-auto p-6 grid gap-6 ${
          isDesktop ? 'max-w-7xl grid-cols-[2fr_1fr]' : 'max-w-2xl grid-cols-1'
        }`}
      >
        <div className="flex flex-col gap-6 min-w-0">
          <AppControlCopilot userId={profile!.id} isCoach={true} />
          <TemplateBuilder coachId={profile!.id} />
          <RosterPanel coachId={profile!.id} />
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          <AiBrainPanel userId={profile!.id} />
        </div>
      </motion.main>
    </div>
  );
}
