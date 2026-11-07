import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Json } from '../../lib/database.types';
import type { MealPlanRow } from '../../hooks/useMealPlans';

export default function PublishMealPlan({ coachId, plan, clients }: { coachId: string; plan: MealPlanRow; clients: { id: string; first_name: string; last_name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState(plan.client_id ?? '');
  const now = new Date();
  const [date, setDate] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const locked = useRef(false);
  const request = useRef<{ operation: string; assignment: string; recipient: string; date: string; data: Json } | null>(null);
  const owner = useRef(coachId); owner.current = coachId;
  const publish = async () => {
    if (locked.current || owner.current !== coachId || !client || !date) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      request.current ??= { operation: crypto.randomUUID(), assignment: crypto.randomUUID(), recipient: client, date, data: plan.data as Json };
      const captured = request.current;
      const { data, error: failure } = await supabase.rpc('publish_meal_plan', { p_operation_id: captured.operation, p_assignment_id: captured.assignment, p_coach_id: coachId, p_plan_id: plan.id, p_trainee_id: captured.recipient, p_start_date: captured.date, p_expected_data: captured.data });
      if (failure) throw new Error(failure.message);
      if (data !== captured.assignment) throw new Error('Publication confirmation missing. Retry the same publication.');
      if (owner.current === coachId) { setSaved(data); request.current = null; }
    } catch (failure) { if (owner.current === coachId) setError(failure instanceof Error ? failure.message : 'Could not publish plan.'); }
    finally { locked.current = false; if (owner.current === coachId) setBusy(false); }
  };
  return <div className="space-y-2">
    <button type="button" onClick={() => setOpen(value => !value)} className="text-sm text-primary">{open ? 'Close publication' : 'Publish to trainee'}</button>
    {open && <div className="border border-border rounded-lg p-3 space-y-3 max-w-md">
      <p className="text-xs text-muted-foreground">Publish a fixed copy, starting on the selected local date. Listed days run once in order. A new publication replaces the prior plan from its start date; saved intake and older publications remain unchanged.</p>
      <label className="block text-sm">Trainee<select aria-label="Meal plan trainee" value={client} disabled={busy || Boolean(request.current) || Boolean(saved)} onChange={e => setClient(e.target.value)} className="block bg-background border border-border p-2 w-full"><option value="">Choose a linked trainee</option>{clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select></label>
      <label className="block text-sm">Start date<input aria-label="Meal plan start date" type="date" value={date} disabled={busy || Boolean(request.current) || Boolean(saved)} onChange={e => setDate(e.target.value)} className="block bg-background border border-border p-2" /></label>
      {error && <p role="alert" className="text-sm text-danger">{error} Retry keeps the same publication request. If the draft must be corrected, reload this page first.</p>}
      {saved ? <p role="status" className="text-sm text-success">Published copy {saved}. The trainee can refresh Nutrition to read it.</p> : <button type="button" disabled={busy || !client || !date} onClick={() => void publish()} className="text-primary">{busy ? 'Publishing…' : request.current ? 'Retry same publication' : 'Publish fixed meal plan'}</button>}
    </div>}
  </div>;
}
