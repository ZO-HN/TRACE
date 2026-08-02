import { useTraceUser } from '../hooks/useTraceUser';
import { useDeviceSize } from '../hooks/useDeviceSize';
import AiBrainPanel from './chat/AiBrainPanel';
import AppControlCopilot from './chat/AppControlCopilot';
import RosterPanel from './coach/RosterPanel';
import TemplateBuilder from './coach/TemplateBuilder';

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
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error || (!isLoading && !profile)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-white mb-2">Session Error</h2>
          <p className="text-sm text-gray-400 mb-4">
            {error?.message ?? 'Could not load your profile. Please sign in again.'}
          </p>
          <button
            onClick={() => (window.location.href = '/auth/login')}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-gray-100 font-sans">
      <header className="bg-surface border-b border-border py-3 px-6 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">TRACE Coach</h1>
        <span className="text-sm text-gray-400">
          {profile?.first_name} {profile?.last_name}
        </span>
      </header>

      <main
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
      </main>
    </div>
  );
}
