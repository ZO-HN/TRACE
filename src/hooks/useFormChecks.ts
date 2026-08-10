// Coach's form-check review queue — mirrors useCheckIns.ts's shape/pattern.
// Trainees submit these from TRACE-client (INSERT into form_checks as
// themselves); this repo only reads and reviews.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type FormCheckStatus = 'unreviewed' | 'reviewed';

export interface FormCheckRow {
  id: string;
  client_id: string;
  client_name: string;
  exercise_id: string | null;
  exercise_name: string | null;
  video_key: string | null;
  status: FormCheckStatus;
  coach_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

interface RawFormCheckRow {
  id: string;
  client_id: string;
  exercise_id: string | null;
  video_key: string | null;
  status: FormCheckStatus;
  coach_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  client: { first_name: string; last_name: string } | null;
  exercise: { name: string } | null;
}

export interface UseFormChecks {
  formChecks: FormCheckRow[];
  isLoading: boolean;
  error: string | null;
  markReviewed: (id: string, notes: string) => Promise<{ error: string | null }>;
}

export function useFormChecks(coachId: string): UseFormChecks {
  const [formChecks, setFormChecks] = useState<FormCheckRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchFormChecks = async () => {
      const { data, error: queryError } = await supabase
        .from('form_checks')
        .select(
          'id, client_id, exercise_id, video_key, status, coach_notes, submitted_at, reviewed_at, client:profiles!form_checks_client_id_fkey(first_name,last_name), exercise:exercises(name)',
        )
        .eq('coach_id', coachId)
        .order('submitted_at', { ascending: false });

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
      } else {
        setError(null);
        const mapped = ((data as unknown as RawFormCheckRow[]) ?? []).map((r) => ({
          id: r.id,
          client_id: r.client_id,
          client_name: r.client ? `${r.client.first_name} ${r.client.last_name}` : 'Unknown client',
          exercise_id: r.exercise_id,
          exercise_name: r.exercise?.name ?? null,
          video_key: r.video_key,
          status: r.status,
          coach_notes: r.coach_notes,
          submitted_at: r.submitted_at,
          reviewed_at: r.reviewed_at,
        }));
        setFormChecks(mapped);
      }
      setIsLoading(false);
    };

    fetchFormChecks();

    const channel = supabase
      .channel(`coach-form-checks-${coachId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'form_checks' }, () => fetchFormChecks())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [coachId]);

  const markReviewed = async (id: string, notes: string) => {
    const { error: updateError } = await supabase
      .from('form_checks')
      .update({ status: 'reviewed', reviewed_at: new Date().toISOString(), coach_notes: notes })
      .eq('id', id);
    return { error: updateError?.message ?? null };
  };

  return { formChecks, isLoading, error, markReviewed };
}
