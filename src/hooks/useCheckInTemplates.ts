// Check-in templates a coach authors — the client app renders these as a
// form for the trainee to fill out when submitting a check-in.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface CheckInQuestion {
  id: string;
  label: string;
  type: 'text' | 'number' | 'scale';
}

export interface CheckInTemplate {
  id: string;
  name: string;
  questions: CheckInQuestion[];
  created_at: string;
}

export interface UseCheckInTemplates {
  templates: CheckInTemplate[];
  isLoading: boolean;
  error: string | null;
  createTemplate: (name: string, questions: CheckInQuestion[]) => Promise<{ error: string | null }>;
  deleteTemplate: (id: string) => Promise<{ error: string | null }>;
}

export function useCheckInTemplates(coachId: string): UseCheckInTemplates {
  const [templates, setTemplates] = useState<CheckInTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    const { data, error: queryError } = await supabase
      .from('check_in_templates')
      .select('id, name, questions, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
      setTemplates((data as CheckInTemplate[]) ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await fetchTemplates();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createTemplate = async (name: string, questions: CheckInQuestion[]) => {
    const { error: insertError } = await supabase
      .from('check_in_templates')
      .insert({ coach_id: coachId, name, questions });
    if (!insertError) await fetchTemplates();
    return { error: insertError?.message ?? null };
  };

  const deleteTemplate = async (id: string) => {
    const { error: deleteError } = await supabase.from('check_in_templates').delete().eq('id', id);
    if (!deleteError) await fetchTemplates();
    return { error: deleteError?.message ?? null };
  };

  return { templates, isLoading, error, createTemplate, deleteTemplate };
}
