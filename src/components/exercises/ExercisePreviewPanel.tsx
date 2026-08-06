import { AlertCircle, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MuscleGroup } from '@/hooks/useMuscleGroups';

export interface ValidationIssue {
  message: string;
}

export interface ExercisePreviewPanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  name: string;
  movementProfile: string | null;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  equipmentTags: string[];
  issues: ValidationIssue[];
  dirty: boolean;
}

export default function ExercisePreviewPanel({
  collapsed,
  onToggleCollapsed,
  name,
  movementProfile,
  primary,
  secondary,
  equipmentTags,
  issues,
  dirty,
}: ExercisePreviewPanelProps) {
  if (collapsed) {
    return (
      <div className="w-10 shrink-0 border-l border-border flex flex-col items-center pt-4">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-surface"
          title="Show preview"
        >
          <PanelRightOpen size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 border-l border-border flex flex-col min-h-0 overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-bold text-foreground">Preview</h3>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              dirty ? 'text-warning border-warning/40 bg-warning/10' : 'text-muted-foreground border-border',
            )}
          >
            {dirty ? 'Unsaved' : 'Saved'}
          </span>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-surface"
            title="Hide preview"
          >
            <PanelRightClose size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-3 pb-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-sm font-bold text-foreground">{name.trim() || 'Exercise Name'}</p>
          {movementProfile && <p className="text-xs text-muted-foreground mt-1">Profile: {movementProfile}</p>}
        </div>

        {(primary.length > 0 || secondary.length > 0) && (
          <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-foreground">Muscle Groups</p>
            {primary.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Primary</p>
                <div className="flex flex-wrap gap-1">
                  {primary.map((m) => (
                    <span key={m.id} className="rounded-full bg-success/15 text-success text-[11px] font-medium px-2 py-0.5">
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {secondary.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Secondary</p>
                <div className="flex flex-wrap gap-1">
                  {secondary.map((m) => (
                    <span key={m.id} className="rounded-full bg-primary/15 text-primary text-[11px] font-medium px-2 py-0.5">
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold text-foreground mb-1.5">Equipment</p>
          {equipmentTags.length === 0 ? (
            <p className="text-xs text-muted-foreground">None selected</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {equipmentTags.map((e) => (
                <span key={e} className="rounded-full bg-muted text-foreground text-[11px] font-medium px-2 py-0.5">
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>

        {issues.length > 0 && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
            <p className="text-xs font-semibold text-warning flex items-center gap-1.5 mb-1.5">
              <AlertCircle size={13} /> Missing Required Fields
            </p>
            <ul className="text-xs text-warning/90 list-disc list-inside space-y-0.5">
              {issues.map((issue) => (
                <li key={issue.message}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{primary.length + secondary.length}</p>
            <p className="text-[10px] text-muted-foreground">Muscle Groups</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{equipmentTags.length}</p>
            <p className="text-[10px] text-muted-foreground">Equipment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
