import { useMemo, useState } from 'react';
import Model, { type IExerciseData, type IMuscleStats, type Muscle } from 'react-body-highlighter';
import type { MuscleGroup } from '@/hooks/useMuscleGroups';
import type { MuscleRole } from '@/hooks/useExercises';
import { CANONICAL_NAME_BY_LIBRARY_MUSCLE, libraryMuscleForName } from './muscleLibraryMap';

export interface MuscleModelProps {
  muscleGroups: MuscleGroup[];
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  onSetRole: (muscle: MuscleGroup, role: MuscleRole) => void;
  onRemove: (id: string) => void;
}

export default function MuscleModel({ muscleGroups, primary, secondary, onSetRole, onRemove }: MuscleModelProps) {
  const [side, setSide] = useState<'front' | 'back'>('front');

  const data: IExerciseData[] = useMemo(() => {
    const roleByRegion = new Map<Muscle, MuscleRole>();
    for (const m of secondary) {
      const region = libraryMuscleForName(m.name);
      if (region) roleByRegion.set(region, 'secondary');
    }
    for (const m of primary) {
      const region = libraryMuscleForName(m.name);
      if (region) roleByRegion.set(region, 'primary'); // primary wins ties
    }
    return [...roleByRegion.entries()].map(([region, role]) => ({
      name: region,
      muscles: [region],
      frequency: role === 'primary' ? 1 : 2,
    }));
  }, [primary, secondary]);

  const byName = useMemo(() => {
    const map = new Map<string, MuscleGroup>();
    for (const m of muscleGroups) map.set(m.name, m);
    return map;
  }, [muscleGroups]);

  const handleClick = ({ muscle }: IMuscleStats) => {
    const canonicalName = CANONICAL_NAME_BY_LIBRARY_MUSCLE[muscle];
    if (!canonicalName) return;
    const target = byName.get(canonicalName);
    if (!target) return;

    const isPrimary = primary.some((m) => m.id === target.id);
    const isSecondary = secondary.some((m) => m.id === target.id);

    if (!isPrimary && !isSecondary) onSetRole(target, 'primary');
    else if (isPrimary) onSetRole(target, 'secondary');
    else onRemove(target.id);
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Muscle Model</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className={side === 'front' ? 'text-foreground font-medium' : 'text-muted-foreground'}>Front</span>
          <button
            type="button"
            onClick={() => setSide((s) => (s === 'front' ? 'back' : 'front'))}
            className="w-10 h-5 rounded-full bg-muted relative transition-colors"
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-all"
              style={{ left: side === 'front' ? '2px' : '22px' }}
            />
          </button>
          <span className={side === 'back' ? 'text-foreground font-medium' : 'text-muted-foreground'}>Back</span>
        </div>
      </div>

      <div className="flex-1 min-h-[600px] rounded-xl border border-border bg-background flex items-center justify-center relative overflow-hidden py-6">
        <div className="muscle-model-canvas h-full [&_.rbh-wrapper]:h-full [&_svg]:h-full [&_svg]:w-auto [&_polygon]:stroke-[var(--border-soft)]">
          <Model
            type={side === 'front' ? 'anterior' : 'posterior'}
            data={data}
            bodyColor="var(--surface-2)"
            highlightedColors={['var(--success)', 'var(--accent)']}
            onClick={handleClick}
            style={{ height: '100%' }}
            svgStyle={{ height: '100%', width: 'auto' }}
          />
        </div>

        {primary.length === 0 && secondary.length === 0 && (
          <p className="absolute bottom-3 text-xs text-muted-foreground">Select muscle groups to see highlights</p>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--success)' }} /> Primary
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent)' }} /> Secondary
        </span>
        <span className="text-muted-foreground/70">Click a region to cycle primary → secondary → none</span>
      </div>
    </div>
  );
}
