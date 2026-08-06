import { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/shadcn/scroll-area';
import type { MuscleGroup } from '@/hooks/useMuscleGroups';
import type { MuscleRole } from '@/hooks/useExercises';

export interface MuscleGroupPickerProps {
  muscleGroups: MuscleGroup[];
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSetRole: (muscle: MuscleGroup, role: MuscleRole) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  showValidation: boolean;
}

function RoleButton({
  active,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  tone: 'primary' | 'secondary';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 px-2 rounded-md text-xs font-semibold border transition-colors',
        active
          ? tone === 'primary'
            ? 'bg-success text-white border-success'
            : 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:text-foreground hover:bg-surface',
      )}
    >
      {active ? '−' : '+'} {label}
    </button>
  );
}

function MuscleChip({ muscle, onRemove }: { muscle: MuscleGroup; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success text-xs font-medium px-2.5 py-1">
      {muscle.name}
      <button type="button" onClick={onRemove} className="hover:text-foreground">
        −
      </button>
    </span>
  );
}

export default function MuscleGroupPicker({
  muscleGroups,
  primary,
  secondary,
  hoveredId,
  onHover,
  onSetRole,
  onRemove,
  onClearAll,
  showValidation,
}: MuscleGroupPickerProps) {
  const [query, setQuery] = useState('');
  const filtered = muscleGroups.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));
  const primaryIds = new Set(primary.map((m) => m.id));
  const secondaryIds = new Set(secondary.map((m) => m.id));
  const hasSelection = primary.length > 0 || secondary.length > 0;

  return (
    <div className="w-80 shrink-0 border-r border-border flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-bold text-foreground">Muscle Groups</h3>
        {hasSelection && (
          <button type="button" onClick={onClearAll} className="text-xs font-medium text-primary hover:underline">
            Clear All
          </button>
        )}
      </div>

      {showValidation && primary.length === 0 && (
        <div className="mx-4 mb-2 rounded-md bg-danger/15 text-danger text-xs font-medium px-2.5 py-1.5">
          Please select at least one primary muscle group
        </div>
      )}

      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search muscle groups..."
            className="w-full h-9 bg-background border border-border rounded-lg pl-8 pr-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary outline-none transition-colors"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4">
        <div className="flex flex-col gap-1 pb-2">
          {filtered.map((m) => (
            <div
              key={m.id}
              onMouseEnter={() => onHover(m.id)}
              onMouseLeave={() => onHover(null)}
              className={cn(
                'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors',
                hoveredId === m.id && 'bg-surface',
              )}
            >
              <span className="text-sm text-foreground">{m.name}</span>
              <div className="flex gap-1 shrink-0">
                <RoleButton active={primaryIds.has(m.id)} label="P" tone="primary" onClick={() => onSetRole(m, 'primary')} />
                <RoleButton active={secondaryIds.has(m.id)} label="S" tone="secondary" onClick={() => onSetRole(m, 'secondary')} />
              </div>
            </div>
          ))}
        </div>

        {primary.length > 0 && (
          <div className="border-t border-border pt-2 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-1.5">Primary</p>
            <div className="flex flex-wrap gap-1.5 px-2">
              {primary.map((m) => (
                <MuscleChip key={m.id} muscle={m} onRemove={() => onRemove(m.id)} />
              ))}
            </div>
          </div>
        )}

        {secondary.length > 0 && (
          <div className="border-t border-border pt-2 pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-1.5">Secondary</p>
            <div className="flex flex-wrap gap-1.5 px-2">
              {secondary.map((m) => (
                <MuscleChip key={m.id} muscle={m} onRemove={() => onRemove(m.id)} />
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      <div className="m-4 mt-2 rounded-lg border border-border bg-background p-3 flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-foreground">Quick Guide</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-success/20 text-success text-[10px] font-bold flex items-center justify-center">P</span>
          Primary muscle (main movers)
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">S</span>
          Secondary muscle (assisters)
        </p>
        <p className="text-xs text-muted-foreground pt-1 border-t border-border mt-1">At least one primary muscle is required</p>
      </div>
    </div>
  );
}
