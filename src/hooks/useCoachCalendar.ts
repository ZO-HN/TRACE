import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type CalendarEvent = Pick<Database['public']['Tables']['coach_calendar_assignments']['Row'],
  'id' | 'coach_id' | 'trainee_id' | 'template_id' | 'workout_name' | 'scheduled_date' | 'cancelled' | 'revision' | 'created_at'>;
const columns = 'id,coach_id,trainee_id,template_id,workout_name,scheduled_date,cancelled,revision,created_at';

export function useCoachCalendar(ownerId: string, from: string, to: string, traineeId?: string) {
  const key = JSON.stringify([ownerId, from, to, traineeId]);
  const owner = useRef(key); owner.current = key;
  const version = useRef(0);
  const scope = useMemo(() => ({ key, alive: false }), [key]);
  const [state, setState] = useState({ key, rows: [] as CalendarEvent[], loading: true, error: null as string | null });
  const refresh = useCallback(async () => {
    if (!scope.alive || owner.current !== key) return;
    const request = ++version.current;
    const current = () => scope.alive && owner.current === key && request === version.current;
    setState({ key, rows: [], loading: true, error: null });
    try {
      const rows: CalendarEvent[] = [];
      for (let offset = 0; ; offset += 200) {
        let query = supabase.from('coach_calendar_assignments').select(columns).eq('coach_id', ownerId)
          .gte('scheduled_date', from).lte('scheduled_date', to);
        if (traineeId) query = query.eq('trainee_id', traineeId);
        const result = await query.order('scheduled_date').order('id').range(offset, offset + 199);
        if (!current()) return;
        if (result.error) throw new Error(result.error.message);
        rows.push(...(result.data ?? []));
        if (!result.data || result.data.length < 200) break;
      }
      if (current()) setState({ key, rows, loading: false, error: null });
    } catch (cause) {
      if (current()) setState({ key, rows: [], loading: false, error: cause instanceof Error ? cause.message : 'Could not load calendar.' });
    }
  }, [scope, key, ownerId, from, to, traineeId]);
  useEffect(() => { scope.alive = true; void refresh(); return () => { scope.alive = false; }; }, [scope, refresh]);
  return { rows: state.key === key ? state.rows : [], loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : null, refresh };
}

type CreateArgs = Database['public']['Functions']['schedule_coach_workout']['Args'];
type ChangeArgs = Database['public']['Functions']['change_coach_calendar']['Args'];
type Request = { kind: 'schedule'; args: CreateArgs } | { kind: 'change'; args: ChangeArgs };

export function useCalendarWrite(coachId: string) {
  const owner = useRef(coachId); owner.current = coachId;
  const scope = useMemo(() => ({ owner: coachId, alive: false, request: null as Request | null, flight: null as Promise<boolean> | null }), [coachId]);
  const [state, setState] = useState({ owner: coachId, busy: false, pending: false, error: null as string | null });
  useEffect(() => { scope.alive = true; return () => { scope.alive = false; }; }, [scope]);
  const run = (request?: Request): Promise<boolean> => {
    if (!scope.alive || owner.current !== coachId) return Promise.resolve(false);
    if (scope.flight) return scope.flight;
    if (scope.request && request && JSON.stringify(scope.request) !== JSON.stringify(request)) {
      setState({ owner: coachId, busy: false, pending: true, error: 'Retry the unchanged pending calendar operation first.' });
      return Promise.resolve(false);
    }
    scope.request ??= request ?? null;
    if (!scope.request) return Promise.resolve(false);
    const captured = scope.request;
    const current = () => scope.alive && owner.current === coachId;
    setState({ owner: coachId, busy: true, pending: true, error: null });
    const flight = Promise.resolve().then(async () => {
      if (!current()) return false;
      try {
        const result = captured.kind === 'schedule'
          ? await supabase.rpc('schedule_coach_workout', captured.args)
          : await supabase.rpc('change_coach_calendar', captured.args);
        if (result.error) throw new Error(result.error.message);
        const expected = captured.kind === 'schedule' ? captured.args.p_event_id : captured.args.p_expected_revision + 1;
        if (result.data !== expected) throw new Error('Unknown calendar outcome. Retry unchanged.');
        scope.request = null;
        if (current()) setState({ owner: coachId, busy: false, pending: false, error: null });
        return current();
      } catch (cause) {
        if (current()) setState({ owner: coachId, busy: false, pending: true, error: cause instanceof Error ? cause.message : 'Could not save calendar.' });
        return false;
      }
    });
    scope.flight = flight;
    void flight.finally(() => { if (scope.flight === flight) scope.flight = null; });
    return flight;
  };
  return { busy: state.owner === coachId && state.busy, pending: state.owner === coachId && state.pending,
    error: state.owner === coachId ? state.error : null,
    schedule: (args: Omit<CreateArgs, 'p_coach_id'>) => run({ kind: 'schedule', args: { ...args, p_coach_id: coachId } }),
    change: (args: Omit<ChangeArgs, 'p_coach_id'>) => run({ kind: 'change', args: { ...args, p_coach_id: coachId } }),
    retry: () => run() };
}
