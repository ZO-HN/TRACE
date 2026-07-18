// Pure builders for client-side workout sessions. The session row is created
// client-first (UUID) so offline logging can reference it before it syncs.

import type { WorkoutSessionInsert } from '../outbox/types';

export interface SessionDraft {
  id: string;
  userId: string;
  sessionName: string;
  startedAtMs: number;
}

export function createSessionDraft(
  userId: string,
  sessionName: string,
  nowMs: number = Date.now(),
  id: string = crypto.randomUUID(),
): SessionDraft {
  return { id, userId, sessionName, startedAtMs: nowMs };
}

/** Build the insert payload with duration measured from draft start to now. */
export function sessionInsertFrom(
  draft: SessionDraft,
  nowMs: number = Date.now(),
  templateId: string | null = null,
): WorkoutSessionInsert {
  return {
    id: draft.id,
    user_id: draft.userId,
    template_id: templateId,
    session_name: draft.sessionName,
    completed_at: new Date(nowMs).toISOString(),
    duration_seconds: Math.max(0, Math.round((nowMs - draft.startedAtMs) / 1000)),
  };
}
