// Coach dashboard analytics — reads the RPCs from
// supabase/migrations/20260813000000_coach_dashboard_analytics.sql and
// supabase/migrations/20260815000000_steps_and_cardio_tracking.sql.
// Churn = no workout_sessions in 21 days (and had at least one before
// that) OR the coach manually marked the client churned via useClients.

import { useEffect, useState } from 'react';
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

export interface CardioSummaryRow {
  client_id: string;
  client_name: string;
  cardio_sessions: number;
  cardio_minutes: number;
}

export interface UseDashboardStats {
  stats: DashboardStats | null;
  wins: WeeklyWin[];
  nutrition: NutritionSummaryRow[];
  steps: StepsSummaryRow[];
  cardio: CardioSummaryRow[];
  isLoading: boolean;
  error: string | null;
}

export function useDashboardStats(coachId: string): UseDashboardStats {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [wins, setWins] = useState<WeeklyWin[]>([]);
  const [nutrition, setNutrition] = useState<NutritionSummaryRow[]>([]);
  const [steps, setSteps] = useState<StepsSummaryRow[]>([]);
  const [cardio, setCardio] = useState<CardioSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const [statsRes, winsRes, nutritionRes, stepsRes, cardioRes] = await Promise.all([
        supabase.rpc('get_coach_dashboard_stats', { p_coach_id: coachId }).maybeSingle(),
        supabase.rpc('get_coach_weekly_wins', { p_coach_id: coachId }),
        supabase.rpc('get_coach_nutrition_summary', { p_coach_id: coachId, p_days: 7 }),
        supabase.rpc('get_coach_steps_summary', { p_coach_id: coachId, p_days: 7 }),
        supabase.rpc('get_coach_cardio_summary', { p_coach_id: coachId, p_days: 7 }),
      ]);
      const statsRow = statsRes.data as {
        new_signups_7d: number;
        workouts_7d: number;
        churned_count: number;
      } | null;

      if (cancelled) return;

      const firstError = statsRes.error ?? winsRes.error ?? nutritionRes.error ?? stepsRes.error ?? cardioRes.error;
      if (firstError) {
        setError(firstError.message);
      } else {
        setError(null);
        setStats(
          statsRow
            ? {
                newSignups7d: Number(statsRow.new_signups_7d ?? 0),
                workouts7d: Number(statsRow.workouts_7d ?? 0),
                churnedCount: Number(statsRow.churned_count ?? 0),
              }
            : { newSignups7d: 0, workouts7d: 0, churnedCount: 0 },
        );
        setWins((winsRes.data as WeeklyWin[]) ?? []);
        setNutrition((nutritionRes.data as NutritionSummaryRow[]) ?? []);
        setSteps((stepsRes.data as StepsSummaryRow[]) ?? []);
        setCardio((cardioRes.data as CardioSummaryRow[]) ?? []);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  return { stats, wins, nutrition, steps, cardio, isLoading, error };
}
