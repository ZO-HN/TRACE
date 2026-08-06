import { useState } from 'react';
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/components/layout/AppShell';
import { useCheckIns, type CheckInRow } from '@/hooks/useCheckIns';
import { useCheckInTemplates, type CheckInQuestion } from '@/hooks/useCheckInTemplates';
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

function CreateTemplateDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, questions: CheckInQuestion[]) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<CheckInQuestion[]>([
    { id: crypto.randomUUID(), label: '', type: 'text' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateQuestion = (id: string, patch: Partial<CheckInQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const removeQuestion = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id));

  const handleSubmit = async () => {
    setSubmitting(true);
    const cleanQuestions = questions.filter((q) => q.label.trim());
    const { error: submitError } = await onCreate(name, cleanQuestions);
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setName('');
    setQuestions([{ id: crypto.randomUUID(), label: '', type: 'text' }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Check-in Template</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Template name</Label>
          <Input placeholder="e.g. Weekly check-in" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Questions</Label>
          {questions.map((q) => (
            <div key={q.id} className="flex gap-2">
              <Input
                placeholder="Question label"
                value={q.label}
                onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                className="flex-1"
              />
              <Select
                value={q.type}
                onChange={(e) => updateQuestion(q.id, { type: e.target.value as CheckInQuestion['type'] })}
                className="w-28"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="scale">Scale</option>
              </Select>
              <button
                type="button"
                onClick={() => removeQuestion(q.id)}
                className="text-muted-foreground hover:text-danger px-2"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setQuestions((qs) => [...qs, { id: crypto.randomUUID(), label: '', type: 'text' }])}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline w-fit"
          >
            <Plus size={12} /> Add question
          </button>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="button"
          disabled={!name.trim() || submitting}
          onClick={handleSubmit}
          className="h-11 rounded-lg bg-success text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {submitting ? 'Saving...' : 'Create Template'}
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function CheckInsPage() {
  const profile = useProfile();
  const { needsReview, overdue, scheduled, isLoading, error, markReviewed } = useCheckIns(profile.id);
  const { templates, isLoading: templatesLoading, error: templatesError, createTemplate, deleteTemplate } =
    useCheckInTemplates(profile.id);

  const [active, setActive] = useState<(typeof tabs)[number]['key']>('needs-review');
  const [reviewing, setReviewing] = useState<CheckInRow | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Check-ins</h1>
        {active === 'templates' && (
          <button
            type="button"
            onClick={() => setTemplateDialogOpen(true)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> New Template
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
          <EmptyState title="No templates yet" description="Build reusable check-in templates to send to your clients." />
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardContent className="pt-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.questions.length} question(s)</p>
                  </div>
                  <button
                    onClick={() => void deleteTemplate(t.id)}
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
      <CreateTemplateDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} onCreate={createTemplate} />
    </div>
  );
}
