import { useState } from 'react';
import {
  ArrowUpDown,
  Dumbbell,
  Grid2x2,
  List,
  Plus,
  Save,
  Search,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import { useExerciseCatalog } from '@/hooks/useExerciseCatalog';
import { addWorkout, useWorkoutLibrary, WORKOUT_CATEGORIES, type WorkoutCategory } from '@/hooks/useWorkoutLibrary';
import { Input, Select } from '@/components/ui/shadcn/field';

const columns = ['Title', 'Creator', 'Created At', 'Used In'];

function WorkoutBuilder({ onClose }: { onClose: () => void }) {
  const { rows } = useExerciseCatalog();
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WorkoutCategory | ''>('');

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addWorkout({ name: trimmed, category: category || 'Full Body' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-surface">
            <X size={18} />
          </button>
          <h2 className="text-base font-semibold text-foreground">New Workout</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
            <Sparkles size={14} /> AI Generate
          </button>
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
          >
            <Save size={14} /> Save &amp; Close
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-80 shrink-0 border-r border-border flex flex-col p-3 gap-2 min-h-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">RECENT ({filtered.length})</span>
            <div className="flex items-center gap-1">
              <button className="flex items-center gap-1 h-7 px-2 rounded-md bg-success text-white text-xs font-semibold">
                <Plus size={12} /> New
              </button>
              <button onClick={() => setView('list')} className={`p-1 rounded-md ${view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}>
                <List size={14} />
              </button>
              <button onClick={() => setView('grid')} className={`p-1 rounded-md ${view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}>
                <Grid2x2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 min-h-0">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No exercises found.</p>
            ) : (
              filtered.slice(0, 50).map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface cursor-grab text-sm text-foreground"
                >
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Dumbbell size={14} className="text-muted-foreground" />
                  </div>
                  {ex.name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
          <div className="flex gap-3">
            <Input
              placeholder="Workout name"
              className="flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Select
              className="w-40"
              value={category}
              onChange={(e) => setCategory(e.target.value as WorkoutCategory)}
            >
              <option value="" disabled>
                Category
              </option>
              {WORKOUT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <Input placeholder="Add a description (optional)" />

          <div className="flex-1 min-h-0 rounded-xl border border-dashed border-border-soft flex flex-col items-center justify-center text-center gap-3 p-8">
            <div className="text-muted-foreground">☰</div>
            <p className="text-base font-semibold text-foreground">Drag exercises from the left to add</p>
            <p className="text-sm text-muted-foreground">Build your workout by dragging exercises from the library panel</p>
            <div className="flex gap-2 w-full max-w-md">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search exercises..." className="pl-8" />
              </div>
              <button className="flex items-center gap-1.5 h-10 px-3 rounded-lg bg-success text-white text-sm font-semibold">
                <Plus size={14} /> New
              </button>
            </div>
          </div>
        </div>

        <div className="w-72 shrink-0 border-l border-border p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
            <List size={14} /> Arrangement
          </div>
          <p className="text-sm font-medium text-foreground">No exercises</p>
          <p className="text-xs text-muted-foreground">Add exercises to see arrangement</p>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutsPage() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const workouts = useWorkoutLibrary();

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Workouts</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Create workout
          </button>
          <button className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors">
            <Settings2 size={14} /> View
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground">
          {columns.map((c) => (
            <span key={c} className="flex items-center gap-1">
              {c} <ArrowUpDown size={12} />
            </span>
          ))}
        </div>

        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
            <Dumbbell size={32} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No workouts yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Workouts are the building blocks of your programs, built from your exercise library — create one to start assembling a plan.
            </p>
            <button
              type="button"
              onClick={() => setBuilderOpen(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity mt-1"
            >
              Create workout
            </button>
          </div>
        ) : (
          <div>
            {workouts.map((w) => (
              <div
                key={w.id}
                className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-border last:border-b-0 text-sm items-center"
              >
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Dumbbell size={14} className="text-muted-foreground shrink-0" />
                  {w.name}
                </div>
                <span className="text-muted-foreground">{w.author}</span>
                <span className="text-muted-foreground">
                  {new Date(w.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-muted-foreground">—</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {builderOpen && <WorkoutBuilder onClose={() => setBuilderOpen(false)} />}
    </div>
  );
}
