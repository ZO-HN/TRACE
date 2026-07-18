// Map raw logger UI input into a validated set_logs insert payload.
// Pure and framework-free so it can be unit-tested without rendering GymLogger.

import type { SetLogInsert } from './types';
import { lbsToKg } from '../units';

export interface SetInput {
  id: string; // client UUID — outbox idempotency key
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightLbs: string | number;
  reps: string | number;
  rpe?: string | number | null;
  /** R2 object key of an uploaded form-check clip (see ADR 0001). */
  formVideoKey?: string | null;
}

function toNumber(value: string | number): number {
  return typeof value === 'string' ? Number(value) : value;
}

/** True when weight and reps are present and non-negative finite numbers. */
export function isValidSetInput(input: SetInput): boolean {
  // Number('') and Number('  ') are 0, not NaN — reject blank strings first.
  const isBlank = (v: string | number) =>
    typeof v === 'string' && v.trim() === '';
  if (isBlank(input.weightLbs) || isBlank(input.reps)) return false;

  const weight = toNumber(input.weightLbs);
  const reps = toNumber(input.reps);
  return (
    Number.isFinite(weight) &&
    weight >= 0 &&
    Number.isInteger(reps) &&
    reps >= 0
  );
}

/** Build the DB payload. Assumes isValidSetInput(input) is true. */
export function toSetLogInsert(input: SetInput): SetLogInsert {
  const rpe =
    input.rpe == null || input.rpe === '' ? null : Math.trunc(toNumber(input.rpe));

  return {
    id: input.id,
    session_id: input.sessionId,
    exercise_id: input.exerciseId,
    set_number: input.setNumber,
    weight_kg: lbsToKg(toNumber(input.weightLbs)),
    reps: Math.trunc(toNumber(input.reps)),
    rpe: Number.isFinite(rpe as number) ? rpe : null,
    is_completed: true,
    form_video_s3_key: input.formVideoKey ?? null,
  };
}
