// Outbox types for offline session logging.
// See docs/specs/offline-sync-outbox.md.

/**
 * Insert payload for public.set_logs.
 *
 * IMPORTANT: `estimated_1rm` is a GENERATED ALWAYS column in the database
 * (weight_kg * (1 + reps / 30)) and must NEVER appear in a write payload.
 * It is intentionally absent from this type.
 */
export interface SetLogInsert {
  id: string; // client-generated UUID — also the outbox idempotency key
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe?: number | null;
  is_completed?: boolean;
  form_video_s3_key?: string | null;
}

/**
 * Insert payload for public.workout_sessions.
 *
 * RLS on workout_sessions allows owners INSERT + SELECT only (no UPDATE),
 * so sessions are insert-once: never re-flush after a successful sync.
 */
export interface WorkoutSessionInsert {
  id: string; // client-generated UUID
  user_id: string;
  template_id?: string | null;
  session_name: string;
  completed_at?: string; // ISO; DB defaults to NOW() if omitted
  duration_seconds: number;
  rpe_average?: number | null;
  compliance_score?: number | null;
}

export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type OutboxTable = 'workout_sessions' | 'set_logs';

export interface OutboxItem {
  id: string; // mirrors payload.id — the idempotency key
  /** Target table. Items persisted before this field existed are set_logs. */
  table?: OutboxTable;
  payload: SetLogInsert | WorkoutSessionInsert;
  status: OutboxStatus;
  attempts: number;
  updated_at: string; // ISO timestamp
  last_error?: string;
}
