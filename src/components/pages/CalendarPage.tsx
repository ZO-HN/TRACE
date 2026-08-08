import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkoutLibrary, WORKOUT_CATEGORIES, type WorkoutCategory, type WorkoutOption } from '@/hooks/useWorkoutLibrary';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateKey(year: number, month: number, date: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
}

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: number; inMonth: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: daysInPrevMonth - i, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push({ date: cells.length - (startOffset + daysInMonth) + 1, inMonth: false });
  }
  return cells;
}

function WorkoutPickerModal({
  library,
  targetLabel,
  onClose,
  onAssign,
}: {
  library: WorkoutOption[];
  targetLabel: string;
  onClose: () => void;
  onAssign: (workout: WorkoutOption) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<WorkoutCategory | 'All'>('All');
  const [selected, setSelected] = useState<WorkoutOption | null>(null);

  const filtered = library.filter((w) => {
    const matchesQuery = w.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === 'All' || w.category === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-start justify-center p-6 pt-24">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search workouts for ${targetLabel}...`}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border overflow-x-auto">
          {(['All', ...WORKOUT_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'shrink-0 h-7 px-3 rounded-full text-xs font-medium transition-colors',
                category === c
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-surface',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex h-80">
          <div className="w-64 shrink-0 border-r border-border overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-4">
                {library.length === 0
                  ? 'No workouts yet — create one in the Workouts tab.'
                  : 'No workouts found.'}
              </p>
            ) : (
              filtered.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelected(w)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                    selected?.id === w.id ? 'bg-primary/10' : 'hover:bg-surface',
                  )}
                >
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <LayoutDashboard size={14} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.category} &middot;{w.author}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
            {selected ? (
              <>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <LayoutDashboard size={20} className="text-muted-foreground" />
                </div>
                <p className="text-base font-semibold text-foreground">{selected.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.category} &middot; {selected.author}
                </p>
                <button
                  onClick={() => onAssign(selected)}
                  className="mt-3 h-9 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Add to {targetLabel}
                </button>
              </>
            ) : (
              <>
                <LayoutDashboard size={28} className="text-muted-foreground" />
                <p className="text-base font-semibold text-foreground">Select a workout</p>
                <p className="text-sm text-muted-foreground">Choose from the list to see exercises and details</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const library = useWorkoutLibrary();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [assignments, setAssignments] = useState<Record<string, WorkoutOption[]>>({});
  const [pickerDate, setPickerDate] = useState<{ key: string; label: string } | null>(null);

  const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const goToMonth = (delta: number) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  const isToday = (date: number, inMonth: boolean) =>
    inMonth &&
    date === today.getDate() &&
    cursor.getMonth() === today.getMonth() &&
    cursor.getFullYear() === today.getFullYear();

  const isPast = (date: number, inMonth: boolean) => {
    if (!inMonth) return false;
    return dateKey(cursor.getFullYear(), cursor.getMonth(), date) < todayKey;
  };

  const hasEvents = useMemo(() => Object.values(assignments).some((v) => v.length > 0), [assignments]);

  const openPicker = (date: number) => {
    const key = dateKey(cursor.getFullYear(), cursor.getMonth(), date);
    const label = new Date(cursor.getFullYear(), cursor.getMonth(), date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    setPickerDate({ key, label });
  };

  const assignWorkout = (workout: WorkoutOption) => {
    if (!pickerDate) return;
    setAssignments((prev) => ({
      ...prev,
      [pickerDate.key]: [...(prev[pickerDate.key] ?? []), workout],
    }));
    setPickerDate(null);
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{monthLabel}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="h-9 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => goToMonth(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => goToMonth(1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-3 py-2 text-xs font-semibold text-muted-foreground text-center">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const key = cell.inMonth ? dateKey(cursor.getFullYear(), cursor.getMonth(), cell.date) : '';
            const events = cell.inMonth ? (assignments[key] ?? []) : [];
            const past = isPast(cell.date, cell.inMonth);
            const canAdd = cell.inMonth && !past;

            return (
              <div
                key={i}
                className={cn(
                  'group relative h-24 border-b border-r border-border last:border-r-0 p-2 flex flex-col gap-1 [&:nth-child(7n)]:border-r-0',
                  !cell.inMonth && 'bg-background/40',
                  isToday(cell.date, cell.inMonth) && 'ring-1 ring-inset ring-primary',
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs',
                      isToday(cell.date, cell.inMonth)
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : cell.inMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/50',
                    )}
                  >
                    {cell.date}
                  </span>
                  {canAdd && (
                    <button
                      onClick={() => openPicker(cell.date)}
                      aria-label="Add workout"
                      className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-foreground transition-opacity"
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto">
                  {events.map((ev, idx) => (
                    <div
                      key={`${ev.id}-${idx}`}
                      className={cn(
                        'flex items-center gap-1 px-1.5 py-1 rounded-md text-xs font-medium truncate',
                        past ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-foreground',
                      )}
                      title={ev.name}
                    >
                      <LayoutDashboard size={10} className="shrink-0" />
                      <span className="truncate">{ev.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {hasEvents
          ? 'Workouts can be scheduled for today or any future date — past workouts stay visible here for reference.'
          : 'No events scheduled yet — hover a day (today or later) and press + to assign a workout.'}
      </p>

      {pickerDate && (
        <WorkoutPickerModal
          library={library}
          targetLabel={pickerDate.label}
          onClose={() => setPickerDate(null)}
          onAssign={assignWorkout}
        />
      )}
    </div>
  );
}
