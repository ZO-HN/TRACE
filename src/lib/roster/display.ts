// Pure display mappers for the coach roster (rows come from the
// get_coach_roster_telemetry RPC defined in the schema-gaps migration).

export interface RosterRow {
  trainee_id: string;
  first_name: string;
  last_name: string;
  experience_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  total_sessions: number;
  latest_hrv: number | null;
  latest_sleep_score: number | null;
  latest_readiness_score: number | null;
  latest_biometric_date: string | null;
}

export type ReadinessBand = 'ready' | 'moderate' | 'low' | 'unknown';

/** Band the 0-100 readiness score for at-a-glance triage. */
export function readinessBand(score: number | null | undefined): ReadinessBand {
  if (score == null || Number.isNaN(score)) return 'unknown';
  if (score >= 70) return 'ready';
  if (score >= 40) return 'moderate';
  return 'low';
}

export function fullName(row: Pick<RosterRow, 'first_name' | 'last_name'>): string {
  return `${row.first_name} ${row.last_name}`.trim();
}
