import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Json } from '../lib/database.types';

export type OnboardingAnswer = string | string[] | { month: string; day: string; year: string } | { protein: string; carbs: string; fat: string };
type Answers = Record<string, OnboardingAnswer>;
type Draft = { id: string; trainee_id: string; invite_id: string; coach_name: string; revision: number; answers: Answers; form_config: { k: string; e: boolean }[]; submitted_response_id: string | null };
function parseDraft(value: unknown, user: string, invite: string): Draft {
  const d = value as Draft | null;
  if (!d || typeof d.id !== 'string' || d.trainee_id !== user || d.invite_id !== invite ||
    typeof d.coach_name !== 'string' || !Number.isInteger(d.revision) || d.revision < 0 || !d.answers || typeof d.answers !== 'object' || Array.isArray(d.answers) ||
    !Array.isArray(d.form_config) || d.form_config.some(f => typeof f.k !== 'string' || typeof f.e !== 'boolean') ||
    (d.submitted_response_id !== null && typeof d.submitted_response_id !== 'string')) throw new Error('Invalid onboarding response. Reload to try again.');
  return d;
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to save onboarding. Please try again.';

export function useClientOnboarding(userId: string | null, inviteId: string | null, preview: boolean) {
  const owner = preview ? '' : `${userId ?? ''}:${inviteId ?? ''}`;
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const epoch = useRef(0);
  const live = useRef(false);
  const active = useRef(false);
  const draftRef = useRef<Draft | null>(null);
  const saveRequest = useRef<{ draftId: string; revision: number; answers: Answers } | null>(null);
  const pending = useRef<{ draftId: string; operation: string; revision: number } | null>(null);
  const [state, setState] = useState<{ owner: string; draft: Draft | null; answers: Answers; loading: boolean; busy: boolean; uncertain: boolean; error: string | null }>({ owner, draft: null, answers: {}, loading: false, busy: false, uncertain: false, error: null });
  const valid = useCallback((generation: number) => live.current && epoch.current === generation && currentOwner.current === owner, [owner]);
  const reload = useCallback(async () => {
    if (!userId || !inviteId || preview || active.current || !live.current || currentOwner.current !== owner) return;
    const generation = epoch.current;
    active.current = true;
    setState(s => ({ ...s, owner, loading: true, error: null }));
    try {
      const { data, error } = await supabase.rpc('get_client_onboarding', { p_invite_id: inviteId });
      if (error) throw new Error(error.message);
      const draft = parseDraft(data, userId, inviteId);
      if (!valid(generation)) return;
      draftRef.current = draft; pending.current = null; saveRequest.current = null;
      setState({ owner, draft, answers: draft.answers, loading: false, busy: false, uncertain: false, error: null });
    } catch (error) {
      if (valid(generation)) setState(s => ({ ...s, loading: false, error: message(error) }));
    } finally { if (valid(generation)) active.current = false; }
  }, [userId, inviteId, preview, owner, valid]);
  useEffect(() => {
    live.current = true;
    const generation = ++epoch.current;
    active.current = false; draftRef.current = null; pending.current = null; saveRequest.current = null;
    setState({ owner, draft: null, answers: {}, loading: Boolean(userId && inviteId && !preview), busy: false, uncertain: false, error: null });
    void reload();
    return () => { live.current = false; epoch.current = generation + 1; };
  }, [owner, reload, userId, inviteId, preview]);
  const visible = state.owner === owner ? state : { ...state, draft: null, answers: {}, loading: true, busy: false, uncertain: false, error: null };
  const setAnswers = (update: Answers | ((answers: Answers) => Answers)) => {
    if (!live.current || currentOwner.current !== owner || active.current || pending.current || saveRequest.current || draftRef.current?.submitted_response_id) return;
    setState(s => ({ ...s, answers: typeof update === 'function' ? update(s.answers) : update }));
  };
  const perform = async (complete: boolean): Promise<boolean> => {
    if (preview) return true;
    if (!live.current || currentOwner.current !== owner) return false;
    const draft = draftRef.current;
    if (!draft || !userId || !inviteId || active.current || draft.submitted_response_id) return false;
    if (pending.current && !complete) return false;
    const generation = epoch.current;
    active.current = true;
    setState(s => ({ ...s, busy: true, error: null }));
    try {
      let saved = draft;
      if (!pending.current) {
        saveRequest.current ??= { draftId: draft.id, revision: draft.revision, answers: visible.answers };
        const request = saveRequest.current;
        const { data, error } = await supabase.rpc('save_client_onboarding', { p_draft_id: request.draftId, p_expected_revision: request.revision, p_answers: request.answers as Json });
        if (error) throw new Error(error.message);
        saved = parseDraft(data, userId, inviteId);
        if (!valid(generation)) return false;
        draftRef.current = saved; saveRequest.current = null;
        setState(s => ({ ...s, draft: saved }));
      }
      if (complete) {
        pending.current ??= { draftId: saved.id, operation: crypto.randomUUID(), revision: saved.revision };
        const request = pending.current;
        setState(s => ({ ...s, uncertain: true }));
        const { data, error } = await supabase.rpc('complete_client_onboarding', { p_draft_id: request.draftId, p_operation_id: request.operation, p_expected_revision: request.revision });
        if (error) throw new Error(error.message);
        if (typeof data !== 'string' || !data) throw new Error('Missing submission confirmation. Retry or reload to check.');
        if (!valid(generation)) return false;
        saved = { ...saved, submitted_response_id: data };
        draftRef.current = saved; pending.current = null;
        setState(s => ({ ...s, draft: saved, uncertain: false }));
      }
      return valid(generation);
    } catch (error) {
      if (valid(generation)) setState(s => ({ ...s, error: message(error) }));
      return false;
    } finally {
      if (valid(generation)) { active.current = false; setState(s => ({ ...s, busy: false })); }
    }
  };
  return { ...visible, editingLocked: visible.busy || visible.uncertain || Boolean(saveRequest.current), setAnswers, reload, save: () => perform(false), complete: () => perform(true) };
}
