// Coach roster: connected trainees with latest telemetry, plus per-trainee
// 1-on-1 chat (reuses ChatPanel — the coach side of the messaging pair).

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Users, X } from 'lucide-react';
import { useCoachRoster } from '../../hooks/useCoachRoster';
import { fullName, readinessBand, type RosterRow } from '../../lib/roster/display';
import ChatPanel from '../chat/ChatPanel';
import Badge, { type BadgeTone } from '../ui/Badge';
import Card from '../ui/Card';
import Button from '../ui/Button';

const BAND_TONE: Record<ReturnType<typeof readinessBand>, BadgeTone> = {
  ready: 'success',
  moderate: 'warning',
  low: 'danger',
  unknown: 'neutral',
};

function RosterCard({ row, coachId, delay }: { row: RosterRow; coachId: string; delay: number }) {
  const [chatOpen, setChatOpen] = useState(false);
  const band = readinessBand(row.latest_readiness_score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <Card>
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{fullName(row)}</h3>
            <p className="text-xs text-gray-500">
              {row.experience_level.toLowerCase()} · {row.total_sessions} sessions
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge tone={BAND_TONE[band]}>
              {band === 'unknown' ? 'no data' : `readiness ${row.latest_readiness_score}`}
            </Badge>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setChatOpen((v) => !v)}
              icon={chatOpen ? <X size={13} /> : <MessageCircle size={13} />}
            >
              {chatOpen ? 'Close' : 'Chat'}
            </Button>
          </div>
        </div>
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 pb-3 overflow-hidden"
            >
              <ChatPanel myId={coachId} peerId={row.trainee_id} peerLabel={fullName(row)} />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function LiveIndicator({ isLive }: { isLive: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
      <span
        className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}
      />
      {isLive ? 'Live' : 'Connecting…'}
    </span>
  );
}

export default function RosterPanel({ coachId }: { coachId: string }) {
  const { roster, isLoading, error, isLive } = useCoachRoster(coachId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-surface border border-border animate-pulse" />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-red-400">Could not load roster: {error}</p>;
  }
  if (roster.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center gap-2 text-center">
        <Users className="w-7 h-7 text-gray-500" />
        <p className="text-sm text-gray-400">No connected trainees yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Roster
        </h2>
        <LiveIndicator isLive={isLive} />
      </div>
      {roster.map((row, i) => (
        <RosterCard key={row.trainee_id} row={row} coachId={coachId} delay={i * 0.05} />
      ))}
    </div>
  );
}
