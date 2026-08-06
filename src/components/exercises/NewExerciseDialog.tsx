import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMuscleGroups, type MuscleGroup } from '@/hooks/useMuscleGroups';
import type { CreateExerciseInput, ExerciseType, MuscleRole } from '@/hooks/useExercises';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadcn/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';
import MuscleGroupPicker from './MuscleGroupPicker';
import MuscleModel from './MuscleModel';
import ExercisePreviewPanel, { type ValidationIssue } from './ExercisePreviewPanel';
import { CATEGORIES, EQUIPMENT_OPTIONS, EQUIPMENT_QUICK_GROUPS, EXERCISE_TYPES, MOVEMENT_PROFILES, POSITIONS } from './exerciseFormOptions';

function SectionHeader({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-1 h-4 rounded-full" style={{ backgroundColor: color }} />
      <h3 className="text-sm font-bold text-foreground">{children}</h3>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 flex-1">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn('w-10 h-5 rounded-full relative transition-colors shrink-0', checked ? 'bg-success' : 'bg-muted')}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: checked ? '22px' : '2px' }}
        />
      </button>
    </div>
  );
}

function EquipmentPicker({ selected, onChange }: { selected: string[]; onChange: (tags: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (tag: string) =>
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  const addGroup = (group: string) => {
    const additions = EQUIPMENT_QUICK_GROUPS[group] ?? [];
    onChange([...new Set([...selected, ...additions])]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        {Object.keys(EQUIPMENT_QUICK_GROUPS).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => addGroup(g)}
            className="flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-surface transition-colors"
          >
            <Plus size={12} /> {g}
          </button>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors"
          >
            {selected.length > 0 ? `${selected.length} equipment selected` : 'Select equipment...'}
            <Plus size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <div className="p-1 max-h-64 overflow-y-auto">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer">
                <input type="checkbox" className="accent-primary" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground text-xs font-medium px-2.5 py-1">
              {tag}
              <button type="button" onClick={() => toggle(tag)} className="hover:text-danger">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewExerciseDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateExerciseInput) => Promise<{ error: string | null }>;
}) {
  const { muscleGroups } = useMuscleGroups();

  const [tab, setTab] = useState<'form' | 'model'>('form');
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [hoveredMuscleId, setHoveredMuscleId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('regular');
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [isUnilateral, setIsUnilateral] = useState(false);
  const [movementProfile, setMovementProfile] = useState<string>('Descending');
  const [position, setPosition] = useState<string>('');
  const [equipmentTags, setEquipmentTags] = useState<string[]>([]);
  const [coachingCues, setCoachingCues] = useState<string[]>(['', '']);
  const [primary, setPrimary] = useState<MuscleGroup[]>([]);
  const [secondary, setSecondary] = useState<MuscleGroup[]>([]);

  const [showValidation, setShowValidation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const dirty =
    name.trim() !== '' ||
    category !== '' ||
    description.trim() !== '' ||
    primary.length > 0 ||
    secondary.length > 0 ||
    equipmentTags.length > 0 ||
    coachingCues.some((c) => c.trim() !== '');

  const issues: ValidationIssue[] = useMemo(() => {
    const list: ValidationIssue[] = [];
    if (!name.trim()) list.push({ message: 'Exercise name is required' });
    if (!category) list.push({ message: 'Category is required' });
    if (primary.length === 0) list.push({ message: 'At least one primary muscle is required' });
    return list;
  }, [name, category, primary]);

  const setRole = (muscle: MuscleGroup, role: MuscleRole) => {
    setPrimary((p) => p.filter((m) => m.id !== muscle.id));
    setSecondary((s) => s.filter((m) => m.id !== muscle.id));

    const alreadyHadRole =
      (role === 'primary' && primary.some((m) => m.id === muscle.id)) ||
      (role === 'secondary' && secondary.some((m) => m.id === muscle.id));
    if (alreadyHadRole) return; // toggling off

    if (role === 'primary') setPrimary((p) => [...p, muscle]);
    else setSecondary((s) => [...s, muscle]);
  };

  const removeMuscle = (id: string) => {
    setPrimary((p) => p.filter((m) => m.id !== id));
    setSecondary((s) => s.filter((m) => m.id !== id));
  };

  const reset = () => {
    setName('');
    setCategory('');
    setDescription('');
    setExerciseType('regular');
    setIsBodyweight(false);
    setIsUnilateral(false);
    setMovementProfile('Descending');
    setPosition('');
    setEquipmentTags([]);
    setCoachingCues(['', '']);
    setPrimary([]);
    setSecondary([]);
    setShowValidation(false);
    setSubmitError(null);
    setTab('form');
  };

  const handleCancel = () => {
    if (dirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    reset();
    onOpenChange(false);
  };

  const handleDiscard = () => {
    setConfirmDiscardOpen(false);
    reset();
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (issues.length > 0) {
      setShowValidation(true);
      return;
    }
    setSubmitting(true);
    const { error } = await onCreate({
      name: name.trim(),
      category,
      description,
      exerciseType,
      movementProfile: movementProfile || null,
      position: position || null,
      isBodyweight,
      isUnilateral,
      coachingCues: coachingCues.map((c) => c.trim()).filter(Boolean),
      equipmentTags,
      primaryMuscles: primary,
      secondaryMuscles: secondary,
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(error);
      return;
    }
    reset();
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, name, category, description, exerciseType, isBodyweight, isUnilateral, movementProfile, position, equipmentTags, coachingCues, primary, secondary]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4 sm:p-6">
    <div className="w-full max-w-[1400px] h-full max-h-[900px] bg-background rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div>
          <h2 className="text-base font-bold text-foreground">New Exercise</h2>
          <p className="text-xs text-muted-foreground">Create a new exercise for your library</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCancel} className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <Save size={14} /> {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <MuscleGroupPicker
          muscleGroups={muscleGroups}
          primary={primary}
          secondary={secondary}
          hoveredId={hoveredMuscleId}
          onHover={setHoveredMuscleId}
          onSetRole={setRole}
          onRemove={removeMuscle}
          onClearAll={() => {
            setPrimary([]);
            setSecondary([]);
          }}
          showValidation={showValidation}
        />

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
              <button
                type="button"
                onClick={() => setTab('form')}
                className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', tab === 'form' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                Form
              </button>
              <button
                type="button"
                onClick={() => setTab('model')}
                className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', tab === 'model' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                Model
              </button>
            </div>
          </div>

          {tab === 'model' ? (
            <MuscleModel
              muscleGroups={muscleGroups}
              primary={primary}
              secondary={secondary}
              onSetRole={setRole}
              onRemove={removeMuscle}
            />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-6">
              <div>
                <SectionHeader color="var(--success)">Basic Information</SectionHeader>
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>
                        Exercise Name <span className="text-danger">*</span>
                      </Label>
                      <Input placeholder="e.g., Barbell Bench Press" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>
                        Category <span className="text-danger">*</span>
                      </Label>
                      <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="" disabled>
                          Select category
                        </option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Description</Label>
                    <Textarea placeholder="Brief description of the exercise..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <SectionHeader color="var(--accent)">Exercise Properties</SectionHeader>
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Exercise Type</Label>
                    <Select value={exerciseType} onChange={(e) => setExerciseType(e.target.value as ExerciseType)} className="w-56">
                      {EXERCISE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex gap-3">
                    <ToggleCard
                      title="Bodyweight Exercise"
                      description="Can be done with little to no equipment"
                      checked={isBodyweight}
                      onChange={setIsBodyweight}
                    />
                    <ToggleCard
                      title="Unilateral Exercise"
                      description="Performed one limb at a time"
                      checked={isUnilateral}
                      onChange={setIsUnilateral}
                    />
                  </div>
                </div>
              </div>

              <div>
                <SectionHeader color="#a855f7">Configuration</SectionHeader>
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>Profile</Label>
                      <Select value={movementProfile} onChange={(e) => setMovementProfile(e.target.value)}>
                        {MOVEMENT_PROFILES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Position</Label>
                      <Select value={position} onChange={(e) => setPosition(e.target.value)}>
                        <option value="">Select Position</option>
                        {POSITIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Equipment</Label>
                    <EquipmentPicker selected={equipmentTags} onChange={setEquipmentTags} />
                  </div>
                </div>
              </div>

              <div>
                <SectionHeader color="var(--warning)">Coaching Cues</SectionHeader>
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
                  {coachingCues.map((cue, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <Input
                        placeholder='e.g., "Keep your core tight"'
                        value={cue}
                        onChange={(e) => setCoachingCues((cues) => cues.map((c, idx) => (idx === i ? e.target.value : c)))}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setCoachingCues((cues) => cues.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-danger p-1.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCoachingCues((cues) => [...cues, ''])}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors mt-1"
                  >
                    <Plus size={12} /> Add Coaching Cue
                  </button>
                </div>
              </div>

              {submitError && <p className="text-sm text-danger">{submitError}</p>}
            </div>
          )}
        </div>

        <ExercisePreviewPanel
          collapsed={previewCollapsed}
          onToggleCollapsed={() => setPreviewCollapsed((c) => !c)}
          name={name}
          movementProfile={movementProfile}
          primary={primary}
          secondary={secondary}
          equipmentTags={equipmentTags}
          issues={showValidation ? issues : []}
          dirty={dirty}
        />
      </div>
    </div>

    <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
      <DialogContent className="max-w-md" showClose={false}>
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes. Are you sure you want to leave? All changes will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setConfirmDiscardOpen(false)}
            className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            className="h-10 px-4 rounded-lg bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Discard Changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}
