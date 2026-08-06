import { useState } from 'react';
import { ArrowUpDown, BicepsFlexed, Plus, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import { useProfile } from '@/components/layout/AppShell';
import { useExercises } from '@/hooks/useExercises';
import NewExerciseDialog from '@/components/exercises/NewExerciseDialog';

const columns = ['Name', 'Category', 'Primary muscles', 'Equipment'];

export default function ExercisesPage() {
  const profile = useProfile();
  const { exercises, isLoading, error, createExercise } = useExercises(profile.id);
  const [open, setOpen] = useState(false);

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Exercises</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> New Exercise
          </button>
          <button className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors">
            <Settings2 size={14} /> View
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">Could not load exercises: {error}</p>}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground">
          {columns.map((c) => (
            <span key={c} className="flex items-center gap-1">
              {c} <ArrowUpDown size={12} />
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="p-4 flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-surface animate-pulse" />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
            <BicepsFlexed size={32} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No exercises yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Build your exercise library — each entry tracks primary/secondary muscles, equipment, and coaching cues.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity mt-1"
            >
              <Plus size={14} /> New Exercise
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {exercises.map((ex) => (
              <div key={ex.id} className="grid grid-cols-4 gap-4 px-4 py-3 text-sm items-center">
                <span className="text-foreground font-medium">{ex.name}</span>
                <span className="text-muted-foreground">{ex.category ?? '—'}</span>
                <div className="flex flex-wrap gap-1">
                  {ex.muscles.filter((m) => m.role === 'primary').length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    ex.muscles
                      .filter((m) => m.role === 'primary')
                      .map((m) => (
                        <Badge key={m.id} variant="success" className="text-[10px]">
                          {m.name}
                        </Badge>
                      ))
                  )}
                </div>
                <span className="text-muted-foreground truncate">
                  {ex.equipment_tags.length > 0 ? ex.equipment_tags.join(', ') : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewExerciseDialog open={open} onOpenChange={setOpen} onCreate={createExercise} />
    </div>
  );
}
