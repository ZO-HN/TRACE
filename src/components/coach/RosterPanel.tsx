// Coach roster: connected trainees with latest telemetry, plus per-trainee
// 1-on-1 chat (reuses ChatPanel — the coach side of the messaging pair).

import { useState } from 'react';
import { useCoachRoster } from '../../hooks/useCoachRoster';
import { fullName, readinessBand, type RosterRow } from '../../lib/roster/display';
import ChatPanel from '../chat/ChatPanel';

const BAND_STYLES: Record<ReturnType<typeof readinessBand>, string> = {
  ready: 'bg-green-500/15 text-green-400',
  moderate: 'bg-yellow-500/15 text-yellow-400',
  low: 'bg-red-500/15 text-red-400',
  unknown: 'bg-border/40 text-gray-500',
};

function RosterCard({ row, coachId }: { row: RosterRow; coachId: string }) {
  const [chatOpen, setChatOpen] = useState(false);
  const band = readinessBand(row.latest_readiness_score);

  return (
    <div className="bg-surface border border-border rounded-xl">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{fullName(row)}</h3>
          <p className="text-xs text-gray-500">
            {row.experience_level.toLowerCase()} · {row.total_sessions} sessions
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${BAND_STYLES[band]}`}>
            {band === 'unknown' ? 'no data' : `readiness ${row.latest_readiness_score}`}
          </span>
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="text-xs font-medium bg-background border border-border hover:border-primary text-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {chatOpen ? 'Close' : 'Chat'}
          </button>
        </div>
      </div>
      {chatOpen && (
        <div className="px-3 pb-3">
          <ChatPanel myId={coachId} peerId={row.trainee_id} peerLabel={fullName(row)} />
        </div>
      )}
    </div>
  );
}

export default function RosterPanel({ coachId }: { coachId: string }) {
  const { roster, isLoading, error } = useCoachRoster(coachId);

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading roster...</p>;
  }
  if (error) {
    return <p className="text-sm text-red-400">Could not load roster: {error}</p>;
  }
  if (roster.length === 0) {
    return (
      <div className="bg-surface border border-border p-4 rounded-xl">
        <p className="text-sm text-gray-400">No connected trainees yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {roster.map((row) => (
        <RosterCard key={row.trainee_id} row={row} coachId={coachId} />
      ))}
    </div>
  );
}
