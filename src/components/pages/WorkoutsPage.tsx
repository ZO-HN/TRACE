import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { useProfile } from '../layout/AppShell';
import { useCoachPrivateWorkouts } from '../../hooks/useCoachPrivateWorkouts';
import TemplateBuilder from '../coach/TemplateBuilder';

function PrivateWorkoutLibrary({ coachId }: { coachId: string }) {
  const { rows, loading, error, refresh } = useCoachPrivateWorkouts(coachId);
  const [saved, setSaved] = useState<string | null>(null);
  return <div className="p-6 flex flex-col gap-4">
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-lg font-bold text-foreground">Workouts</h1>
      <div className="flex items-center gap-2">
        <button type="button" disabled={loading} onClick={() => void refresh()} className="h-10 px-3 rounded-lg border border-border">Reload workouts</button>
        <TemplateBuilder coachId={coachId} onSaved={(id) => { setSaved(id); void refresh(); }} />
      </div>
    </div>
    <p className="text-sm text-muted-foreground">Your private workout library. Assignment, programs and calendar delivery are not available here yet.</p>
    {saved && <p role="status" className="text-sm text-success">Workout saved. Reload the library to read its stored prescription.</p>}
    {loading && <p role="status">Loading workouts…</p>}
    {error && <div role="alert" className="text-sm text-red-400">Could not load workouts: {error} <button type="button" onClick={() => void refresh()}>Retry</button></div>}
    {!loading && !error && rows.length === 0 && <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3">
      <Dumbbell size={32} className="mx-auto text-muted-foreground" />
      <p>No private workouts yet. Create one to start your library.</p>
    </div>}
    {!loading && !error && rows.map((workout) => <details key={workout.id} open={workout.id === saved} className="rounded-xl border border-border bg-card p-4">
      <summary className="cursor-pointer font-semibold">{workout.name} <span className="text-sm text-muted-foreground">· {workout.template_items.length} exercises · {new Date(workout.created_at).toLocaleDateString()}</span></summary>
      {workout.description && <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{workout.description}</p>}
      {workout.template_items.length === 0 && <p className="mt-3 text-sm text-muted-foreground">This existing workout has no saved exercises.</p>}
      <ol className="mt-3 space-y-2">
        {workout.template_items.map((item) => <li key={item.id} className="text-sm">
          {item.position}. {item.exercise?.name ?? 'Exercise unavailable'} — {item.target_sets} sets × {item.target_reps} reps{item.target_rpe == null ? '' : ` · RPE ${item.target_rpe}`} · Rest {item.rest_seconds}s
        </li>)}
      </ol>
      <p className="mt-3 text-sm text-muted-foreground">Assignment unavailable: delivery behavior is pending.</p>
    </details>)}
  </div>;
}

export default function WorkoutsPage() {
  const profile = useProfile();
  if (!profile || profile.role !== 'coach') return <p role="alert" className="p-6">A signed-in coach account is required to author workouts.</p>;
  return <PrivateWorkoutLibrary key={profile.id} coachId={profile.id} />;
}
