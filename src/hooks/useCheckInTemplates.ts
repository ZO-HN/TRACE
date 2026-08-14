// Check-in templates a coach authors — the client app renders these as a
// form for the trainee to fill out when submitting a check-in.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type CheckInQuestionType =
  | 'text'
  | 'number'
  | 'scale-5'
  | 'scale-10'
  | 'single-choice'
  | 'multiple-choice'
  | 'photo'
  | 'time'
  | 'bodyweight'
  | 'progress-photo'
  | 'measurement';

export interface CheckInQuestion {
  id: string;
  label: string;
  type: CheckInQuestionType;
  required?: boolean;
  placeholder?: string;
}

export type CheckInFrequency = 'Daily' | 'Weekly' | 'Every two weeks' | 'Custom schedule' | 'Monthly' | 'On-demand only';

export interface CheckInSchedule {
  frequency: CheckInFrequency;
  days: string[];
  notificationTime: string;
  endDate: string;
  active: boolean;
}

export const DEFAULT_SCHEDULE: CheckInSchedule = {
  frequency: 'Weekly',
  days: ['Mon'],
  notificationTime: '09:00',
  endDate: '',
  active: true,
};

export interface CheckInTemplate {
  id: string;
  name: string;
  description: string | null;
  questions: CheckInQuestion[];
  schedule: CheckInSchedule;
  created_at: string;
}

export interface TemplateInput {
  name: string;
  description: string;
  questions: CheckInQuestion[];
  schedule: CheckInSchedule;
}

export interface UseCheckInTemplates {
  templates: CheckInTemplate[];
  isLoading: boolean;
  error: string | null;
  createTemplate: (input: TemplateInput) => Promise<{ error: string | null }>;
  updateTemplate: (id: string, input: TemplateInput) => Promise<{ error: string | null }>;
  deleteTemplate: (id: string) => Promise<{ error: string | null }>;
}

export function useCheckInTemplates(coachId: string): UseCheckInTemplates {
  const [templates, setTemplates] = useState<CheckInTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchTemplates = async () => {
    const { data, error: queryError } = await supabase
      .from('check_in_templates')
      .select('id, name, description, questions, schedule, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (!mountedRef.current) return;
    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
      setTemplates(
        ((data as (CheckInTemplate & { schedule: CheckInSchedule | null })[]) ?? []).map((t) => ({
          ...t,
          schedule: t.schedule && Object.keys(t.schedule).length > 0 ? t.schedule : DEFAULT_SCHEDULE,
        })),
      );
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

  const createTemplate = async (input: TemplateInput) => {
    const { error: insertError } = await supabase.from('check_in_templates').insert({
      coach_id: coachId,
      name: input.name,
      description: input.description || null,
      questions: input.questions,
      schedule: input.schedule,
    });
    if (!insertError) await fetchTemplates();
    return { error: insertError?.message ?? null };
  };

  const updateTemplate = async (id: string, input: TemplateInput) => {
    const { error: updateError } = await supabase
      .from('check_in_templates')
      .update({
        name: input.name,
        description: input.description || null,
        questions: input.questions,
        schedule: input.schedule,
      })
      .eq('id', id);
    if (!updateError) await fetchTemplates();
    return { error: updateError?.message ?? null };
  };

  const deleteTemplate = async (id: string) => {
    const { error: deleteError } = await supabase.from('check_in_templates').delete().eq('id', id);
    if (!deleteError) await fetchTemplates();
    return { error: deleteError?.message ?? null };
  };

  return { templates, isLoading, error, createTemplate, updateTemplate, deleteTemplate };
}
