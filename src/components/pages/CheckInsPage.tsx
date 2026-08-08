import { useState } from 'react';
import { ArrowLeft, ClipboardCheck, FileText, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/components/layout/AppShell';
import { useCheckIns, type CheckInRow } from '@/hooks/useCheckIns';
import {
  useCheckInTemplates,
  DEFAULT_SCHEDULE,
  type CheckInQuestion,
  type CheckInSchedule,
  type CheckInTemplate,
  type TemplateInput,
} from '@/hooks/useCheckInTemplates';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';

const SCHEDULE_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface StarterTemplate {
  key: string;
  name: string;
  frequency: CheckInSchedule['frequency'];
  description: string;
  questions: Omit<CheckInQuestion, 'id'>[];
}

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: 'lifestyle',
    name: 'Lifestyle',
    frequency: 'Weekly',
    description:
      "A well-rounded weekly check-in for clients focused on sustainable habits — covers energy, stress, and sleep alongside the week's wins and obstacles.",
    questions: [
      { label: 'Energy levels this week (1-10)', type: 'scale-10' },
      { label: 'Stress levels this week (1-10)', type: 'scale-10' },
      { label: 'Average hours of sleep', type: 'number' },
      { label: 'Biggest win this week', type: 'text' },
      { label: 'Biggest obstacle this week', type: 'text' },
      { label: 'Adherence to plan (1-10)', type: 'scale-10' },
      { label: 'Anything else on your mind?', type: 'text' },
    ],
  },
  {
    key: 'fat-loss',
    name: 'Fat loss',
    frequency: 'Weekly',
    description:
      'Weekly check-in for a fat-loss phase — tracks hunger, energy, and confidence alongside the usual win/obstacle pair.',
    questions: [
      { label: 'Hunger levels this week (1-10)', type: 'scale-10' },
      { label: 'Energy levels this week (1-10)', type: 'scale-10' },
      { label: 'Confidence in the plan (1-10)', type: 'scale-10' },
      { label: 'Average hours of sleep', type: 'number' },
      { label: 'Biggest win this week', type: 'text' },
      { label: 'Biggest obstacle this week', type: 'text' },
      { label: 'Adherence to nutrition plan (1-10)', type: 'scale-10' },
    ],
  },
  {
    key: 'strength',
    name: 'Strength & performance',
    frequency: 'Weekly',
    description:
      'Weekly check-in for a strength or performance phase — recovery, soreness, and motivation alongside the training itself.',
    questions: [
      { label: 'Recovery quality this week (1-10)', type: 'scale-10' },
      { label: 'Soreness levels (1-10)', type: 'scale-10' },
      { label: 'Motivation this week (1-10)', type: 'scale-10' },
      { label: 'Any missed sessions?', type: 'text' },
      { label: 'PRs or notable performance this week', type: 'text' },
      { label: 'Biggest obstacle this week', type: 'text' },
      { label: 'Adherence to plan (1-10)', type: 'scale-10' },
    ],
  },
  {
    key: 'maintenance',
    name: 'Maintenance',
    frequency: 'Custom schedule',
    description:
      'A lighter-touch check-in for clients in maintenance — a quick pulse on stability rather than a weekly deep-dive. Works well every 2-4 weeks.',
    questions: [
      { label: 'How stable has weight felt?', type: 'text' },
      { label: 'Energy levels (1-10)', type: 'scale-10' },
      { label: 'Adherence to plan (1-10)', type: 'scale-10' },
      { label: 'Anything you want to adjust?', type: 'text' },
      { label: 'Biggest win since last check-in', type: 'text' },
      { label: 'Biggest obstacle since last check-in', type: 'text' },
    ],
  },
  {
    key: 'contest-prep',
    name: 'Contest prep',
    frequency: 'Weekly',
    description:
      'A closer-touch weekly check-in for competition prep — hunger, energy, sleep, and mindset, plus the usual win/obstacle pair. Consider moving to twice-weekly as the show approaches.',
    questions: [
      { label: 'Hunger levels this week (1-10)', type: 'scale-10' },
      { label: 'Energy levels this week (1-10)', type: 'scale-10' },
      { label: 'Average hours of sleep', type: 'number' },
      { label: 'Mindset / mental state (1-10)', type: 'scale-10' },
      { label: 'Biggest win this week', type: 'text' },
      { label: 'Biggest obstacle this week', type: 'text' },
      { label: 'Adherence to plan (1-10)', type: 'scale-10' },
      { label: 'Physique changes noticed', type: 'text' },
    ],
  },
];

const tabs = [
  { key: 'needs-review', label: 'Needs review' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'templates', label: 'Templates' },
] as const;

function LoadingRows() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 rounded-xl bg-surface border border-border animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center py-24">
      <ClipboardCheck size={32} className="text-muted-foreground" />
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

function ReviewDialog({
  checkIn,
  onOpenChange,
  onSubmit,
}: {
  checkIn: CheckInRow | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, notes: string) => Promise<{ error: string | null }>;
}) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!checkIn) return null;

  const entries = Object.entries(checkIn.responses ?? {});

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error: submitError } = await onSubmit(checkIn.id, notes);
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={!!checkIn} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{checkIn.client_name}'s check-in</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No responses recorded for this check-in.</p>
          ) : (
            entries.map(([question, answer]) => (
              <div key={question} className="rounded-lg border border-border bg-background p-2.5">
                <p className="text-xs font-semibold text-muted-foreground">{question}</p>
                <p className="text-sm text-foreground">{String(answer)}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Coach notes</Label>
          <Textarea
            placeholder="Feedback for this check-in..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <DialogFooter>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {submitting ? 'Saving...' : 'Mark reviewed'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckInList({
  rows,
  dateLabel,
  onSelect,
}: {
  rows: CheckInRow[];
  dateLabel: (row: CheckInRow) => string;
  onSelect?: (row: CheckInRow) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <Card key={row.id} className={cn(onSelect && 'cursor-pointer hover:border-primary/40 transition-colors')}>
          <CardContent
            className="pt-5 flex items-center justify-between"
            onClick={() => onSelect?.(row)}
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{row.client_name}</p>
              <p className="text-xs text-muted-foreground">{dateLabel(row)}</p>
            </div>
            <Badge variant={row.status === 'submitted' ? 'success' : 'outline'}>{row.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type BuilderDraft = TemplateInput;

function blankDraft(): BuilderDraft {
  return {
    name: '',
    description: '',
    questions: [{ id: crypto.randomUUID(), label: '', type: 'text', required: true, placeholder: '' }],
    schedule: { ...DEFAULT_SCHEDULE, days: [...DEFAULT_SCHEDULE.days] },
  };
}

function draftFromStarter(starter: StarterTemplate): BuilderDraft {
  return {
    name: starter.name,
    description: starter.description,
    questions: starter.questions.map((q) => ({ id: crypto.randomUUID(), required: true, placeholder: '', ...q })),
    schedule: { ...DEFAULT_SCHEDULE, frequency: starter.frequency, days: [...DEFAULT_SCHEDULE.days] },
  };
}

function draftFromTemplate(template: CheckInTemplate): BuilderDraft {
  return {
    name: template.name,
    description: template.description ?? '',
    questions: template.questions.length
      ? template.questions
      : [{ id: crypto.randomUUID(), label: '', type: 'text', required: true, placeholder: '' }],
    schedule: { ...template.schedule, days: [...template.schedule.days] },
  };
}

function nextOccurrences(days: string[]): string[] {
  if (days.length === 0) return [];
  const dayIndices = days.map((d) => SCHEDULE_DAYS.indexOf(d)).filter((i) => i >= 0);
  if (dayIndices.length === 0) return [];
  const results: string[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);
  for (let i = 0; i < 60 && results.length < 3; i++) {
    if (dayIndices.includes(cursor.getDay())) {
      results.push(cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

function TemplatePickerDialog({
  open,
  onOpenChange,
  onPick,
  onStartBlank,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (starter: StarterTemplate) => void;
  onStartBlank: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Recurring Check-in</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Start from a template</p>
          <p className="text-xs text-muted-foreground">Pick a starting point for a well-scoped check-in, or start from scratch.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {STARTER_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onPick(t)}
              className="flex flex-col gap-2 rounded-xl border border-border p-4 text-left hover:border-primary/50 hover:bg-surface transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{t.name}</span>
                <Badge variant="outline">{t.frequency}</Badge>
              </div>
              <p className="text-xs text-muted-foreground flex-1">{t.description}</p>
              <p className="text-xs text-muted-foreground">{t.questions.length} questions</p>
            </button>
          ))}

          <button
            type="button"
            onClick={onStartBlank}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-center text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors min-h-[132px]"
          >
            <FileText size={18} />
            <span className="text-sm font-semibold">Start blank</span>
            <span className="text-xs">Build every question yourself</span>
          </button>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateBuilderDialog({
  open,
  initialDraft,
  isEditing,
  onOpenChange,
  onBack,
  onSubmit,
}: {
  open: boolean;
  initialDraft: BuilderDraft | null;
  isEditing: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
  onSubmit: (draft: BuilderDraft) => Promise<{ error: string | null }>;
}) {
  const [draft, setDraft] = useState<BuilderDraft>(initialDraft ?? blankDraft());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const applyIncomingDraft = (next: BuilderDraft) => {
    setDraft(next);
    setError(null);
  };

  // Re-seed the draft whenever the dialog is opened with a new starting point.
  const draftKey = initialDraft ? `${initialDraft.name}-${initialDraft.questions.length}` : '';
  const [seededKey, setSeededKey] = useState('');
  if (open && initialDraft && draftKey !== seededKey) {
    setSeededKey(draftKey);
    applyIncomingDraft(initialDraft);
  }

  const updateQuestion = (id: string, patch: Partial<CheckInQuestion>) =>
    setDraft((d) => ({ ...d, questions: d.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) }));

  const removeQuestion = (id: string) => setDraft((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== id) }));

  const toggleDay = (day: string) =>
    setDraft((d) => ({
      ...d,
      schedule: {
        ...d.schedule,
        days: d.schedule.days.includes(day) ? d.schedule.days.filter((x) => x !== day) : [...d.schedule.days, day],
      },
    }));

  const handleSubmit = async () => {
    setSubmitting(true);
    const cleanQuestions = draft.questions.filter((q) => q.label.trim());
    const { error: submitError } = await onSubmit({ ...draft, questions: cleanQuestions });
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    onOpenChange(false);
  };

  const occurrences = nextOccurrences(draft.schedule.days);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Check-in Template' : 'Create Recurring Check-in'}</DialogTitle>
        </DialogHeader>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-fit -mt-2"
          >
            <ArrowLeft size={12} /> Back to templates
          </button>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Template name *</Label>
          <Input
            placeholder="e.g., Weekly Progress Check-in"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Description (optional)</Label>
          <Textarea
            placeholder="Describe the purpose of this check-in template..."
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Frequency</Label>
            <Select
              value={draft.schedule.frequency}
              onChange={(e) =>
                setDraft((d) => ({ ...d, schedule: { ...d.schedule, frequency: e.target.value as CheckInSchedule['frequency'] } }))
              }
            >
              <option>Daily</option>
              <option>Weekly</option>
              <option>Every two weeks</option>
              <option>Custom schedule</option>
              <option>Monthly</option>
              <option>On-demand only</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notification time</Label>
            <Input
              type="time"
              value={draft.schedule.notificationTime}
              onChange={(e) => setDraft((d) => ({ ...d, schedule: { ...d.schedule, notificationTime: e.target.value } }))}
            />
            <p className="text-xs text-muted-foreground">Time when clients will be notified to complete the check-in</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Schedule days</Label>
          <div className="flex gap-1.5 flex-wrap">
            {SCHEDULE_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-medium border transition-colors',
                  draft.schedule.days.includes(day)
                    ? 'bg-success/15 border-success text-success'
                    : 'border-border text-muted-foreground hover:bg-surface',
                )}
              >
                {day}
              </button>
            ))}
          </div>
          {occurrences.length > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs text-muted-foreground">Next occurrences</span>
              <div className="flex gap-1.5 flex-wrap">
                {occurrences.map((d) => (
                  <span key={d} className="text-xs rounded-md border border-border px-2 py-1 text-foreground">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>End date (optional)</Label>
          <Input
            type="date"
            value={draft.schedule.endDate}
            onChange={(e) => setDraft((d) => ({ ...d, schedule: { ...d.schedule, endDate: e.target.value } }))}
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">Leave empty to send indefinitely</p>
        </div>

        <label
          className={cn(
            'flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
            draft.schedule.active ? 'border-success bg-success/10' : 'border-border',
          )}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">Active schedule</p>
            <p className="text-xs text-muted-foreground">Enable to automatically send check-ins on the scheduled days</p>
          </div>
          <input
            type="checkbox"
            checked={draft.schedule.active}
            onChange={(e) => setDraft((d) => ({ ...d, schedule: { ...d.schedule, active: e.target.checked } }))}
            className="accent-success size-4 shrink-0"
          />
        </label>

        <div className="flex flex-col gap-2">
          <Label>Questions *</Label>
          {draft.questions.map((q) => (
            <div key={q.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your question..."
                  value={q.label}
                  onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="text-muted-foreground hover:text-danger px-2"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={q.type}
                  onChange={(e) => updateQuestion(q.id, { type: e.target.value as CheckInQuestion['type'] })}
                  className="w-40"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="scale-5">Scale (1-5)</option>
                  <option value="scale-10">Scale (1-10)</option>
                  <option value="single-choice">Single Choice</option>
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="photo">Photo</option>
                  <option value="time">Time</option>
                  <option value="bodyweight">Bodyweight</option>
                  <option value="progress-photo">Progress Photo</option>
                  <option value="measurement">Measurement</option>
                </Select>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={q.required ?? false}
                    onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                    className="accent-success"
                  />
                  Required
                </label>
              </div>
              <Input
                placeholder="Placeholder (optional)"
                value={q.placeholder ?? ''}
                onChange={(e) => updateQuestion(q.id, { placeholder: e.target.value })}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                questions: [...d.questions, { id: crypto.randomUUID(), label: '', type: 'text', required: true, placeholder: '' }],
              }))
            }
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline w-fit"
          >
            <Plus size={12} /> Add question
          </button>
          <p className="text-xs text-muted-foreground">
            {draft.questions.length} question{draft.questions.length === 1 ? '' : 's'} &middot; ~{Math.max(1, draft.questions.length)} min to
            complete
          </p>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!draft.name.trim() || draft.questions.filter((q) => q.label.trim()).length === 0 || submitting}
            onClick={handleSubmit}
            className="h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {submitting ? 'Saving...' : isEditing ? 'Save changes' : 'Create'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CheckInsPage() {
  const profile = useProfile();
  const { needsReview, overdue, scheduled, isLoading, error, markReviewed } = useCheckIns(profile.id);
  const { templates, isLoading: templatesLoading, error: templatesError, createTemplate, updateTemplate, deleteTemplate } =
    useCheckInTemplates(profile.id);

  const [active, setActive] = useState<(typeof tabs)[number]['key']>('needs-review');
  const [reviewing, setReviewing] = useState<CheckInRow | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [builderState, setBuilderState] = useState<{ draft: BuilderDraft; editingId: string | null } | null>(null);

  const openPicker = () => setPickerOpen(true);
  const startBlank = () => {
    setPickerOpen(false);
    setBuilderState({ draft: blankDraft(), editingId: null });
  };
  const pickStarter = (starter: StarterTemplate) => {
    setPickerOpen(false);
    setBuilderState({ draft: draftFromStarter(starter), editingId: null });
  };
  const editTemplate = (template: CheckInTemplate) => {
    setBuilderState({ draft: draftFromTemplate(template), editingId: template.id });
  };
  const submitBuilder = (draft: BuilderDraft) =>
    builderState?.editingId ? updateTemplate(builderState.editingId, draft) : createTemplate(draft);

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Check-ins</h1>
        {active === 'templates' && (
          <button
            type="button"
            onClick={openPicker}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Create Recurring Check-in
          </button>
        )}
      </div>

      <div className="inline-flex w-fit items-center rounded-lg bg-muted p-1 text-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              'px-3 py-1.5 rounded-md font-medium transition-colors',
              active === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.key === 'needs-review' && needsReview.length > 0 && (
              <span className="ml-1.5 rounded-full bg-danger/20 text-danger text-[10px] font-semibold px-1.5 py-0.5">
                {needsReview.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {active !== 'templates' && error && <p className="text-sm text-danger">Could not load check-ins: {error}</p>}

      {active === 'needs-review' &&
        (isLoading ? (
          <LoadingRows />
        ) : needsReview.length === 0 ? (
          <EmptyState
            title="Nothing to review"
            description="Submitted check-ins from your whole roster show up here, oldest submission first."
          />
        ) : (
          <CheckInList
            rows={needsReview}
            dateLabel={(r) => `Submitted ${r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}`}
            onSelect={setReviewing}
          />
        ))}

      {active === 'overdue' &&
        (isLoading ? (
          <LoadingRows />
        ) : overdue.length === 0 ? (
          <EmptyState title="Nothing overdue" description="Check-ins your clients missed their deadline for will show up here." />
        ) : (
          <CheckInList rows={overdue} dateLabel={(r) => `Due ${new Date(r.scheduled_for).toLocaleDateString()}`} />
        ))}

      {active === 'scheduled' &&
        (isLoading ? (
          <LoadingRows />
        ) : scheduled.length === 0 ? (
          <EmptyState title="Nothing scheduled" description="Upcoming check-ins scheduled for your clients will show up here." />
        ) : (
          <CheckInList rows={scheduled} dateLabel={(r) => `Due ${new Date(r.scheduled_for).toLocaleDateString()}`} />
        ))}

      {active === 'templates' &&
        (templatesError ? (
          <p className="text-sm text-danger">Could not load templates: {templatesError}</p>
        ) : templatesLoading ? (
          <LoadingRows />
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-24">
            <ClipboardCheck size={32} className="text-muted-foreground" />
            <p className="text-lg font-semibold text-foreground">No recurring check-ins yet</p>
            <p className="text-sm text-muted-foreground max-w-md">Create a recurring check-in to automatically send on a schedule.</p>
            <button
              type="button"
              onClick={openPicker}
              className="flex items-center gap-1.5 h-9 px-3 mt-1 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-surface transition-colors"
            >
              <Plus size={14} /> Create Recurring Check-in
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <Card key={t.id} className="cursor-pointer hover:border-primary/40 transition-colors">
                <CardContent className="pt-5 flex items-center justify-between" onClick={() => editTemplate(t)}>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.questions.length} question(s) &middot; {t.schedule.frequency}
                      {t.schedule.active ? '' : ' · paused'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteTemplate(t.id);
                    }}
                    className="text-muted-foreground hover:text-danger p-1.5 rounded-md hover:bg-background"
                  >
                    <Trash2 size={14} />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

      <ReviewDialog checkIn={reviewing} onOpenChange={(open) => !open && setReviewing(null)} onSubmit={markReviewed} />

      <TemplatePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={pickStarter}
        onStartBlank={startBlank}
      />

      <TemplateBuilderDialog
        open={!!builderState}
        initialDraft={builderState?.draft ?? null}
        isEditing={!!builderState?.editingId}
        onOpenChange={(open) => !open && setBuilderState(null)}
        onBack={!builderState?.editingId ? () => { setBuilderState(null); setPickerOpen(true); } : undefined}
        onSubmit={submitBuilder}
      />
    </div>
  );
}
