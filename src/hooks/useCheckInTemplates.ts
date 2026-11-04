// Check-in templates a coach authors — the client app renders these as a
// form for the trainee to fill out when submitting a check-in.

import { useCallback, useEffect, useRef, useState } from 'react';
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
  refresh: () => Promise<void>;
  createTemplate: (input: TemplateInput) => Promise<{ error: string | null }>;
  updateTemplate: (id: string, input: TemplateInput) => Promise<{ error: string | null }>;
  deleteTemplate: (id: string) => Promise<{ error: string | null }>;
}

type LoadedData = { templates: CheckInTemplate[] };
type LoadScope = { owner: string; request: number };
const emptyData = (): LoadedData => ({ templates: [] });

export function useCheckInTemplates(coachId: string): UseCheckInTemplates {
  const [state, setState] = useState<LoadedData & { isLoading: boolean; error: string | null; owner: string }>(
    () => ({ ...emptyData(), owner: coachId, isLoading: Boolean(coachId), error: null }),
  );
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<LoadScope | null>(null);
  const fetchTemplates = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope && owner.current === scope.owner;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ ...(previous.owner === scope.owner ? previous : emptyData()), owner: scope.owner, isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('check_in_templates')
        .select('id, name, description, questions, schedule, created_at')
        .eq('coach_id', scope.owner)
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      const next: LoadedData = { templates: ((data as (CheckInTemplate & { schedule: CheckInSchedule | null })[]) ?? []).map((t) => ({
        ...t,
        schedule: t.schedule && Object.keys(t.schedule).length > 0 ? t.schedule : DEFAULT_SCHEDULE,
      })) };
      if (current() && scope.request === request) setState({ ...next, owner: scope.owner, isLoading: false, error: null });
    } catch (cause) {
      if (current() && scope.request === request) setState((previous) => ({ ...previous, isLoading: false,
        error: cause instanceof Error ? cause.message : 'Could not load data. Please retry.' }));
    }
  }, []);

  useEffect(() => {
    if (!coachId) {
      active.current = null;
      setState({ ...emptyData(), owner: coachId, isLoading: false, error: null });
      return;
    }
    const scope: LoadScope = { owner: coachId, request: 0 };
    active.current = scope;
    void fetchTemplates(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [coachId, fetchTemplates]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.owner === coachId && owner.current === coachId) await fetchTemplates(scope);
  }, [coachId, fetchTemplates]);

  const runMutation = async (operation: (scope: LoadScope) => Promise<{ error: string | null }>) => {
    const scope = active.current;
    if (!scope || scope.owner !== coachId || owner.current !== coachId) return { error: 'The active account changed. Please retry from the current view.' };
    try {
      const result = await operation(scope);
      if (!result.error && active.current === scope && owner.current === scope.owner) await fetchTemplates(scope);
      return result;
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not complete the operation. Please retry.' };
    }
  };

  const createTemplate = async (input: TemplateInput) => runMutation(async () => {
    const { error: insertError } = await supabase.from('check_in_templates').insert({
      coach_id: coachId,
      name: input.name,
      description: input.description || null,
      questions: input.questions,
      schedule: input.schedule,
    });
    return { error: insertError?.message ?? null };
  });

  const updateTemplate = async (id: string, input: TemplateInput) => runMutation(async () => {
    const { error: updateError } = await supabase
      .from('check_in_templates')
      .update({
        name: input.name,
        description: input.description || null,
        questions: input.questions,
        schedule: input.schedule,
      })
      .eq('id', id);
    return { error: updateError?.message ?? null };
  });

  const deleteTemplate = async (id: string) => runMutation(async () => {
    const { error: deleteError } = await supabase.from('check_in_templates').delete().eq('id', id);
    return { error: deleteError?.message ?? null };
  });

  const visible = state.owner === coachId ? state : { ...emptyData(), isLoading: Boolean(coachId), error: null };
  return { templates: visible.templates, isLoading: visible.isLoading, error: visible.error, refresh, createTemplate, updateTemplate, deleteTemplate };
}
