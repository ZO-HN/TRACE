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

export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface OutboxItem {
  id: string; // mirrors payload.id — the idempotency key
  payload: SetLogInsert;
  status: OutboxStatus;
  attempts: number;
  updated_at: string; // ISO timestamp
  last_error?: string;
}
