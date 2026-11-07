import { useState } from 'react';
import { useProfile } from '../layout/AppShell';
import { useClients } from '../../hooks/useClients';
import { useCoachPrivateWorkouts } from '../../hooks/useCoachPrivateWorkouts';
import { useCalendarWrite, useCoachCalendar, type CalendarEvent } from '../../hooks/useCoachCalendar';
import { expectedWorkoutSnapshot } from '../../lib/templates/assignment';
import ProgramCalendar from '../coach/ProgramCalendar';

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function Calendar({ coachId }: { coachId: string }) {
  const [month, setMonth] = useState(() => dayKey(new Date()).slice(0, 7));
  const [trainee, setTrainee] = useState('');
  const [workout, setWorkout] = useState('');
  const [date, setDate] = useState(() => dayKey(new Date()));
  const [edit, setEdit] = useState<CalendarEvent | null>(null);
  const [editDate, setEditDate] = useState('');
  const roster = useClients(coachId);
  const library = useCoachPrivateWorkouts(coachId);
  const from = `${month}-01`;
  const [year, monthNumber] = month.split('-').map(Number);
  const to = dayKey(new Date(year, monthNumber, 0));
  const calendar = useCoachCalendar(coachId, from, to, trainee || undefined);
  const write = useCalendarWrite(coachId);
  const blocked = write.busy || write.pending;
  const save = async () => {
    const selected = library.rows.find(row => row.id === workout);
    if (!selected || !trainee || !date) return;
    if (await write.schedule({ p_operation_id: crypto.randomUUID(), p_event_id: crypto.randomUUID(),
      p_template_id: crypto.randomUUID(), p_source_template_id: selected.id, p_trainee_id: trainee,
      p_date: date, p_expected_snapshot: expectedWorkoutSnapshot(selected) })) await calendar.refresh();
  };
  const change = async (cancelled: boolean) => {
    if (!edit || !editDate) return;
    if (await write.change({ p_operation_id: crypto.randomUUID(), p_event_id: edit.id,
      p_expected_revision: edit.revision, p_date: editDate, p_cancelled: cancelled })) {
      setEdit(null); await calendar.refresh();
    }
  };
  return <div className="p-6 space-y-5">
    <h1 className="text-lg font-bold">Coach calendar</h1>
    <p className="text-sm text-muted-foreground">Schedule a fixed workout copy for a linked trainee on a local calendar date. Editing its source does not change this copy. Programs and groups have a separate update policy.</p>
    <div className="flex gap-3 flex-wrap items-end">
      <label>Month <input aria-label="Calendar month" type="month" min="2000-01" max="2100-12" value={month} onChange={e => { if (e.target.value) { setMonth(e.target.value); setEdit(null); } }} className="block border border-border bg-card rounded p-2" /></label>
      <label>Trainee <select aria-label="Calendar trainee" disabled={blocked || roster.isLoading || Boolean(roster.error)} value={trainee} onChange={e => { setTrainee(e.target.value); setEdit(null); }} className="block border border-border bg-card rounded p-2">
        <option value="">All linked trainees</option>{roster.clients.map(client => <option key={client.id} value={client.id}>{client.first_name} {client.last_name}</option>)}
      </select></label>
      <button onClick={() => void calendar.refresh()} className="border rounded p-2">Reload calendar</button>
    </div>
    {roster.isLoading && <p role="status">Loading linked trainees…</p>}
    {roster.error && <div role="alert">{roster.error} <button onClick={() => void roster.refresh()}>Retry trainees</button></div>}
    {!roster.isLoading && !roster.error && !roster.clients.length && <p>No linked trainees. Complete onboarding before scheduling.</p>}
    <section className="border border-border rounded-xl p-4 space-y-3" aria-label="Schedule workout">
      <h2 className="font-semibold">Schedule one workout</h2>
      <label className="block">Private workout <select aria-label="Calendar workout" disabled={blocked || library.loading || Boolean(library.error)} value={workout} onChange={e => setWorkout(e.target.value)} className="block border bg-card rounded p-2">
        <option value="">Choose a saved workout</option>{library.rows.filter(row => row.template_items.length > 0).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      {library.loading && <p role="status">Loading workouts…</p>}
      {library.error && <div role="alert">{library.error} <button onClick={() => void library.refresh()}>Retry workouts</button></div>}
      {!library.loading && !library.error && !library.rows.some(row => row.template_items.length > 0) && <p>Create a saved private workout with exercises in Workouts first.</p>}
      <label className="block">Date <input aria-label="Workout date" type="date" min="2000-01-01" max="2100-12-31" disabled={blocked} value={date} onChange={e => setDate(e.target.value)} className="block border bg-card rounded p-2" /></label>
      <button disabled={blocked || !trainee || !workout || !date || Boolean(roster.error) || Boolean(library.error)} onClick={() => void save()} className="rounded bg-primary text-primary-foreground p-2 disabled:opacity-50">Save dated assignment</button>
      {!trainee && <p className="text-sm">Select one linked trainee to schedule.</p>}
    </section>
    {write.busy && <p role="status">Saving calendar…</p>}
    {write.error && <div role="alert" className="text-red-400">{write.error}</div>}
    {write.pending && !write.busy && <div className="space-y-2">
      <p>Input is held for the exact pending operation. Retry to confirm a lost response. After a definitive validation error, reload the page and inspect saved assignments before starting again.</p>
      <button onClick={() => void write.retry().then(async ok => { if (ok) { setEdit(null); await calendar.refresh(); } })} className="border rounded p-2">Retry pending calendar save</button>
    </div>}
    <section aria-label="Saved calendar" className="space-y-3">
      <h2 className="font-semibold">Saved assignments for {month}</h2>
      {calendar.loading && <p role="status">Loading calendar…</p>}
      {calendar.error && <div role="alert">{calendar.error} <button onClick={() => void calendar.refresh()}>Retry calendar</button></div>}
      {!calendar.loading && !calendar.error && !calendar.rows.length && <p>No assignments for this selection.</p>}
      {calendar.rows.map(event => <article key={event.id} className="border border-border rounded-xl p-3 space-y-2">
        <p className="font-semibold">{event.scheduled_date} · {event.workout_name}{event.cancelled ? ' · Cancelled' : ''}</p>
        <p className="text-sm">{roster.clients.find(client => client.id === event.trainee_id)?.first_name ?? 'Trainee'} · revision {event.revision}</p>
        {!event.cancelled && <button disabled={blocked} onClick={() => { setEdit(event); setEditDate(event.scheduled_date); }} className="border rounded p-2">Move or cancel</button>}
        {edit?.id === event.id && <div className="flex flex-wrap gap-2 items-center">
          <input aria-label="Rescheduled date" type="date" min="2000-01-01" max="2100-12-31" disabled={blocked} value={editDate} onChange={e => setEditDate(e.target.value)} className="border bg-card rounded p-2" />
          <button disabled={blocked || !editDate} onClick={() => void change(false)} className="border rounded p-2">Save new date</button>
          <button disabled={blocked} onClick={() => void change(true)} className="border rounded p-2">Cancel planned event</button>
        </div>}
      </article>)}
    </section>
    {trainee?<ProgramCalendar key={`${coachId}:${trainee}:${from}:${to}`} traineeId={trainee} from={from} to={to}/>:<p>Select a trainee to read their live program/group calendar.</p>}
    <p className="text-sm text-muted-foreground">Recorded sessions cannot be moved or cancelled. Cancellation removes a planned event, not the workout copy or recorded history. A workout already downloaded or started offline remains recoverable and can sync later. Dates are planning labels, not access restrictions.</p>
  </div>;
}

export default function CalendarPage() {
  const profile = useProfile();
  if (!profile || profile.role !== 'coach') return <p role="alert" className="p-6">A signed-in coach account is required.</p>;
  return <Calendar key={profile.id} coachId={profile.id} />;
}
