import { useMemo, useState } from 'react';
import type { MuscleGroup } from '@/hooks/useMuscleGroups';
import type { MuscleRole } from '@/hooks/useExercises';
import { MUSCLE_REGIONS, regionsForMuscleName } from './muscleRegions';

export default function MuscleModel({ primary, secondary }: { primary: MuscleGroup[]; secondary: MuscleGroup[] }) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const regionRole = useMemo(() => {
    const map = new Map<string, MuscleRole>();
    for (const m of secondary) {
      for (const r of regionsForMuscleName(m.name)) map.set(r.key, 'secondary');
    }
    // primary takes priority over secondary when a region matches both
    for (const m of primary) {
      for (const r of regionsForMuscleName(m.name)) map.set(r.key, 'primary');
    }
    return map;
  }, [primary, secondary]);

  const regions = MUSCLE_REGIONS.filter((r) => r.side === side);
  const hovered = MUSCLE_REGIONS.find((r) => r.key === hoveredRegion);

  const fillFor = (key: string) => {
    const role = regionRole.get(key);
    if (role === 'primary') return 'var(--success)';
    if (role === 'secondary') return 'var(--accent)';
    return hoveredRegion === key ? 'var(--border-soft)' : 'transparent';
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

      <div className="flex-1 min-h-0 rounded-xl border border-border bg-background flex items-center justify-center relative overflow-hidden">
        {hovered && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-1.5 text-xs shadow-md z-10">
            <span className="font-semibold text-foreground">{hovered.label}</span>
          </div>
        )}

        <svg viewBox="0 0 200 320" className="h-full max-h-96 w-auto">
          {/* body outline */}
          <circle cx="100" cy="35" r="18" fill="none" stroke="var(--border-soft)" strokeWidth="1.5" />
          <path
            d="M70 58 Q100 50 130 58 L138 170 Q120 180 100 180 Q80 180 62 170 Z"
            fill="none"
            stroke="var(--border-soft)"
            strokeWidth="1.5"
          />
          <path d="M62 65 L40 150" fill="none" stroke="var(--border-soft)" strokeWidth="1.5" />
          <path d="M138 65 L160 150" fill="none" stroke="var(--border-soft)" strokeWidth="1.5" />
          <path d="M82 178 L76 300 M118 178 L124 300" fill="none" stroke="var(--border-soft)" strokeWidth="1.5" />
          <path d="M100 178 L100 300" fill="none" stroke="var(--border-soft)" strokeWidth="1" />

          {regions.map((r) =>
            r.shape === 'rect' ? (
              <rect
                key={r.key}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={r.rx}
                fill={fillFor(r.key)}
                stroke="var(--border-soft)"
                strokeWidth="1"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredRegion(r.key)}
                onMouseLeave={() => setHoveredRegion(null)}
              />
            ) : (
              <ellipse
                key={r.key}
                cx={r.x}
                cy={r.y}
                rx={r.w}
                ry={r.h}
                fill={fillFor(r.key)}
                stroke="var(--border-soft)"
                strokeWidth="1"
                className="cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredRegion(r.key)}
                onMouseLeave={() => setHoveredRegion(null)}
              />
            ),
          )}
        </svg>

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
      </div>
    </div>
  );
}
