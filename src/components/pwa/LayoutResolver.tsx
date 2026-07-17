import { useFitsyncUser } from '../../hooks/useFitsyncUser';

// ==========================================
// Role-Based Layout Resolver
// Replaces mock switcher with live DB state
// ==========================================
export default function LayoutResolver() {
  const { isLoading, error, isCoach, isCoachedTrainee, isSoloTrainee, profile } = useFitsyncUser();

  // Loading skeleton
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

  // Auth / fetch error state
  if (error || (!isLoading && !profile)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-white mb-2">Session Error</h2>
          <p className="text-sm text-gray-400 mb-4">
            {error?.message ?? 'Could not load your profile. Please sign in again.'}
          </p>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-sans">
      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col gap-6 mt-6">

        {/* COACH LAYOUT */}
        {isCoach && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-1">
                Welcome, Coach {profile?.first_name}
              </h1>
              <p className="text-sm text-gray-400">Manage your roster and sessions.</p>
            </div>
            <button className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-4 px-4 rounded-xl flex items-center justify-center gap-2 mb-6 transition-colors">
              Launch Jitsi Call
            </button>
            <p className="text-xs text-gray-500 text-center">
              Full desktop studio available on a wider screen.
            </p>
          </div>
        )}

        {/* COACHED TRAINEE LAYOUT */}
        {isCoachedTrainee && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-1">Today's Plan</h1>
              <p className="text-sm text-gray-400">Assigned by your coach.</p>
            </div>
            <div className="bg-surface border border-border p-4 rounded-xl">
              <p className="text-gray-400 text-sm">Your assigned workouts will appear here.</p>
            </div>
          </div>
        )}

        {/* SOLO TRAINEE LAYOUT */}
        {isSoloTrainee && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-1">Workout Directory</h1>
              <p className="text-sm text-gray-400">Choose a template to begin.</p>
            </div>
            <div className="bg-surface border border-border p-4 rounded-xl">
              <p className="text-gray-400 text-sm">Public templates will load here.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
