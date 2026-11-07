import { useState } from 'react';
import { useClients } from '../../hooks/useClients';
import { useWorkoutAssignment } from '../../hooks/useWorkoutAssignment';
import type { PrivateWorkout } from '../../hooks/useCoachPrivateWorkouts';

export default function WorkoutAssignmentDialog({ coachId, workout, onAssigned }: {
  coachId: string; workout: PrivateWorkout; onAssigned: (assignedId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [traineeId, setTraineeId] = useState('');
  const { clients, isLoading, error: rosterError, refresh } = useClients(coachId);
  const { assign, status, error } = useWorkoutAssignment(coachId, workout);
  const saving = status === 'saving';
  const submit = async () => {
    if (!traineeId) return;
    const id = await assign(traineeId);
    if (id) { onAssigned(id); setOpen(false); }
  };
  return <>
    <button type="button" onClick={() => setOpen(true)} className="h-9 px-3 rounded-lg border border-border text-sm">Assign…</button>
    {open && <div role="dialog" aria-modal="true" aria-labelledby={`assign-${workout.id}`} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 id={`assign-${workout.id}`} className="font-semibold">Assign fixed copy: {workout.name}</h2>
        <p className="text-sm text-muted-foreground">This creates a separate workout for the trainee. Later source changes require a new explicit assignment.</p>
        {isLoading && <p role="status">Loading linked trainees…</p>}
        {rosterError && <div role="alert">{rosterError} <button type="button" onClick={() => void refresh()}>Retry trainees</button></div>}
        {!isLoading && !rosterError && clients.length === 0 && <p>No currently linked trainees are available.</p>}
        <label className="block text-sm">Trainee
          <select aria-label="Trainee" value={traineeId} disabled={saving || isLoading || Boolean(rosterError)} onChange={(event) => setTraineeId(event.target.value)} className="mt-1 block w-full h-10 rounded-lg border border-border bg-surface px-2">
            <option value="">Select a linked trainee</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.first_name} {client.last_name}</option>)}
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-red-400">{error} Retry this same workout and trainee to recover a lost response.</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" disabled={saving} onClick={() => setOpen(false)} className="h-10 px-3 rounded-lg border border-border">Close</button>
          <button type="button" disabled={saving || !traineeId || isLoading || clients.length === 0} onClick={() => void submit()} className="h-10 px-3 rounded-lg bg-success text-white disabled:opacity-50">{saving ? 'Assigning…' : status === 'error' ? 'Retry assignment' : 'Assign fixed copy'}</button>
        </div>
      </div>
    </div>}
  </>;
}
