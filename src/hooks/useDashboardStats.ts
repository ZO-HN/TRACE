// Coach dashboard analytics — reads the RPCs from
// supabase/migrations/20260813000000_coach_dashboard_analytics.sql and
// supabase/migrations/20260815000000_steps_and_cardio_tracking.sql.
// Churn = no workout_sessions in 21 days (and had at least one before
// that) OR the coach manually marked the client churned via useClients.

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { dashboardEligible, getDashboardState, getDashboardRevision, getEmptyDashboardState, readDashboard, subscribeDashboard } from '../lib/dashboardAnalyticsCache';
import type { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';

export interface DashboardStats {
  newSignups7d: number;
  workouts7d: number;
  churnedCount: number;
}

export interface WeeklyWin {
  client_id: string;
  client_name: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  estimated_1rm: number;
  achieved_at: string;
}

export interface NutritionSummaryRow {
  client_id: string;
  client_name: string;
  log_count: number;
  avg_calories: number | null;
}

export interface StepsSummaryRow {
  client_id: string;
  client_name: string;
  avg_daily_steps: number | null;
  days_logged: number;
}

export type CardioSummaryRow = Database['public']['Functions']['get_coach_cardio_summary']['Returns'][number];

export interface DashboardSnapshot {
  stats: DashboardStats;
  wins: WeeklyWin[];
  nutrition: NutritionSummaryRow[];
  steps: StepsSummaryRow[];
  cardio: CardioSummaryRow[];
}
export interface UseDashboardStats {
  stats: DashboardStats | null;
  wins: WeeklyWin[];
  nutrition: NutritionSummaryRow[];
  steps: StepsSummaryRow[];
  cardio: CardioSummaryRow[];
  isLoading: boolean;
  isUpdating: boolean;
  updatedAt: number | null;
  error: string | null;
  refresh: () => Promise<void>;
}

async function loadDashboard(coachId: string): Promise<DashboardSnapshot> {
  const [statsRes, winsRes, nutritionRes, stepsRes, cardioRes] = await Promise.all([
    supabase.rpc('get_coach_dashboard_stats', { p_coach_id: coachId }).maybeSingle(),
    supabase.rpc('get_coach_weekly_wins', { p_coach_id: coachId }),
    supabase.rpc('get_coach_nutrition_summary', { p_coach_id: coachId, p_days: 7 }),
    supabase.rpc('get_coach_steps_summary', { p_coach_id: coachId, p_days: 7 }),
    supabase.rpc('get_coach_cardio_summary', { p_coach_id: coachId, p_days: 7 }),
  ]);
  const firstError = statsRes.error ?? winsRes.error ?? nutritionRes.error ?? stepsRes.error ?? cardioRes.error;
  if (firstError) throw new Error(firstError.message);
  const row = statsRes.data as { new_signups_7d: number; workouts_7d: number; churned_count: number } | null;
  // A missing stats row is not a successfully authorized empty dashboard.
  if (!row) throw new Error('Dashboard statistics are unavailable.');
  return {
    stats: { newSignups7d: Number(row.new_signups_7d ?? 0), workouts7d: Number(row.workouts_7d ?? 0), churnedCount: Number(row.churned_count ?? 0) },
    wins: (winsRes.data as WeeklyWin[]) ?? [],
    nutrition: (nutritionRes.data as NutritionSummaryRow[]) ?? [],
    steps: (stepsRes.data as StepsSummaryRow[]) ?? [],
    cardio: (cardioRes.data as CardioSummaryRow[]) ?? [],
  };
}

export function useDashboardStats(coachId: string): UseDashboardStats {
  const state = useSyncExternalStore(subscribeDashboard, getDashboardState, getEmptyDashboardState);
  const eligible = dashboardEligible(coachId);
  const revision = getDashboardRevision();
  const refresh = useCallback(() => readDashboard(coachId, () => loadDashboard(coachId), true), [coachId]);
  useEffect(() => {
    if (!eligible) return;
    const read = () => { void readDashboard(coachId, () => loadDashboard(coachId)); };
    read();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') read(); }, 30_000);
    window.addEventListener('focus', read);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', read); };
  }, [coachId, eligible, revision]);
  // Gate during render too, before effects can run on an account transition.
  const visible = eligible ? state : getEmptyDashboardState();
  return {
    stats: visible.data?.stats ?? null, wins: visible.data?.wins ?? [], nutrition: visible.data?.nutrition ?? [],
    steps: visible.data?.steps ?? [], cardio: visible.data?.cardio ?? [],
    isLoading: eligible && !visible.data && !visible.error,
    isUpdating: visible.isUpdating, updatedAt: visible.updatedAt, error: visible.error, refresh,
  };
}
