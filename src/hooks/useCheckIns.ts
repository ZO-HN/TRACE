// Coach's check-in queue: submissions from connected trainees, split into
// needs-review / overdue / scheduled buckets. Realtime's postgres_changes is
// RLS-aware — this subscription only ever receives events for the coach's
// own clients, per the "Coaches can read their clients' check-ins" policy
// (see supabase/migrations/20260805000000_check_ins.sql).

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { debounce } from '../lib/debounce';

export type CheckInStatus = 'scheduled' | 'submitted' | 'reviewed';

export interface CheckInRow {
  id: string;
  client_id: string;
  client_name: string;
  template_id: string | null;
  status: CheckInStatus;
  scheduled_for: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  coach_notes: string | null;
  responses: Record<string, unknown>;
}

interface RawCheckInRow {
  id: string;
  client_id: string;
  template_id: string | null;
  status: CheckInStatus;
  scheduled_for: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  coach_notes: string | null;
  responses: Record<string, unknown>;
  client: { first_name: string; last_name: string } | null;
}

export interface UseCheckIns {
  needsReview: CheckInRow[];
  overdue: CheckInRow[];
  scheduled: CheckInRow[];
  isLoading: boolean;
  error: string | null;
  markReviewed: (id: string, notes: string) => Promise<{ error: string | null }>;
}

const REFRESH_DEBOUNCE_MS = 500;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useCheckIns(coachId: string): UseCheckIns {
  const [rows, setRows] = useState<CheckInRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCheckIns = async () => {
      const { data, error: queryError } = await supabase
        .from('check_ins')
        .select(
          'id, client_id, template_id, status, scheduled_for, submitted_at, reviewed_at, coach_notes, responses, client:profiles!check_ins_client_id_fkey(first_name,last_name)',
        )
        .eq('coach_id', coachId)
        .order('scheduled_for', { ascending: true });

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
      } else {
        setError(null);
        const mapped = ((data as unknown as RawCheckInRow[]) ?? []).map((r) => ({
          id: r.id,
          client_id: r.client_id,
          client_name: r.client ? `${r.client.first_name} ${r.client.last_name}` : 'Unknown client',
          template_id: r.template_id,
          status: r.status,
          scheduled_for: r.scheduled_for,
          submitted_at: r.submitted_at,
          reviewed_at: r.reviewed_at,
          coach_notes: r.coach_notes,
          responses: r.responses ?? {},
        }));
        setRows(mapped);
      }
      setIsLoading(false);
    };

    fetchCheckIns();
    const refresh = debounce(fetchCheckIns, REFRESH_DEBOUNCE_MS);

    const channel = supabase
      .channel(`coach-check-ins-${coachId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, () => refresh.call())
      .subscribe();

    return () => {
      cancelled = true;
      refresh.cancel();
      supabase.removeChannel(channel);
    };
  }, [coachId]);

  const { needsReview, overdue, scheduled } = useMemo(() => {
    const today = todayIso();
    return {
      needsReview: rows.filter((r) => r.status === 'submitted'),
      overdue: rows.filter((r) => r.status === 'scheduled' && r.scheduled_for < today),
      scheduled: rows.filter((r) => r.status === 'scheduled' && r.scheduled_for >= today),
    };
  }, [rows]);

  const markReviewed = async (id: string, notes: string) => {
    const { error: updateError } = await supabase
      .from('check_ins')
      .update({
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
        reviewed_by: coachId,
        coach_notes: notes,
      })
      .eq('id', id);
    return { error: updateError?.message ?? null };
  };

  return { needsReview, overdue, scheduled, isLoading, error, markReviewed };
}
