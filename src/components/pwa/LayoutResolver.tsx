import { useState } from 'react';
import { useTraceUser } from '../../hooks/useTraceUser';
import { useDeviceSize } from '../../hooks/useDeviceSize';
import { useOutboxSync } from '../../hooks/useOutboxSync';
import GymLogger from './GymLogger';
import JitsiCall from '../call/JitsiCall';
import ChatPanel from '../chat/ChatPanel';
import AiBrainPanel from '../chat/AiBrainPanel';
import RosterPanel from '../coach/RosterPanel';
import TemplateBuilder from '../coach/TemplateBuilder';
import { roomNameFor } from '../../lib/call/room';

// ==========================================
// Role-Based Layout Resolver
// Resolves views on two axes: profile role x viewport size.
// ==========================================
export default function LayoutResolver() {
  const { isLoading, error, isCoach, isCoachedTrainee, isSoloTrainee, profile } = useTraceUser();
  const { isDesktop } = useDeviceSize();
  const [inCall, setInCall] = useState(false);

  // Keep the offline outbox flushing to Supabase whenever connectivity returns.
  useOutboxSync();

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
            <button
              onClick={() => setInCall(true)}
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-4 px-4 rounded-xl flex items-center justify-center gap-2 mb-6 transition-colors"
            >
              Launch Jitsi Call
            </button>
            <div className="mb-4">
              <TemplateBuilder coachId={profile!.id} />
            </div>
            <RosterPanel coachId={profile!.id} />
            {!isDesktop && (
              <p className="text-xs text-gray-500 text-center mt-4">
                Full desktop studio available on a wider screen.
              </p>
            )}
          </div>
        )}

        {/* TRAINEE LAYOUT (coached or solo) — the high-tension gym-floor logger */}
        {(isCoachedTrainee || isSoloTrainee) && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-white mb-1">
                {isCoachedTrainee ? "Today's Plan" : 'Workout'}
              </h1>
              <p className="text-sm text-gray-400">
                {isCoachedTrainee ? 'Assigned by your coach.' : 'Log your session.'}
              </p>
            </div>
            {isCoachedTrainee && (
              <button
                onClick={() => setInCall(true)}
                className="w-full bg-surface border border-border hover:border-primary text-gray-200 font-medium py-3 px-4 rounded-xl mb-4 transition-colors"
              >
                Join Coach Call
              </button>
            )}
            <GymLogger userId={profile!.id} isCoached={isCoachedTrainee} />
            <div className="mt-6">
              <AiBrainPanel userId={profile!.id} />
            </div>
            {isCoachedTrainee && profile!.coach_id && (
              <div className="mt-6">
                <ChatPanel
                  myId={profile!.id}
                  peerId={profile!.coach_id}
                  peerLabel="Your Coach"
                />
              </div>
            )}
          </div>
        )}

      </main>

      {/* Shared per-coach room: the coach hosts it, coached trainees join it */}
      {inCall && profile && (isCoach || profile.coach_id) && (
        <JitsiCall
          roomName={roomNameFor(isCoach ? profile.id : profile.coach_id!)}
          displayName={`${profile.first_name} ${profile.last_name}`}
          onClose={() => setInCall(false)}
        />
      )}
    </div>
  );
}
