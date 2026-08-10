import { useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Select, Input, Textarea } from '@/components/ui/shadcn/field';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { useProfile } from '@/components/layout/AppShell';
import { useFormChecks } from '@/hooks/useFormChecks';
import { useToast } from '@/components/ui/toast';
import MediaViewer from '@/components/media/MediaViewer';

export default function FormChecksPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const { formChecks, isLoading, error, markReviewed } = useFormChecks(profile.id);
  const [statusFilter, setStatusFilter] = useState<'unreviewed' | 'reviewed' | 'all'>('unreviewed');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () => (statusFilter === 'all' ? formChecks : formChecks.filter((f) => f.status === statusFilter)),
    [formChecks, statusFilter],
  );

  const handleReview = async (id: string) => {
    const { error: reviewError } = await markReviewed(id, notesDraft[id] ?? '');
    if (reviewError) {
      toast(`Could not mark reviewed: ${reviewError}`);
      return;
    }
    toast('Form check reviewed.');
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={18} className="text-primary" />
        <h1 className="text-lg font-bold text-foreground">Form Checks</h1>
        <span className="text-sm text-muted-foreground">
          {formChecks.filter((f) => f.status === 'unreviewed').length} unreviewed
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select className="w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="unreviewed">Unreviewed</option>
          <option value="reviewed">Reviewed</option>
          <option value="all">All</option>
        </Select>
        <Select className="w-40" defaultValue="all-clients" disabled>
          <option value="all-clients">All clients</option>
        </Select>
        <Select className="w-40" defaultValue="all-exercises" disabled>
          <option value="all-exercises">All exercises</option>
        </Select>
        <Input type="date" className="w-40" disabled />
        <Input type="date" className="w-40" disabled />
      </div>

      {error && <p className="text-sm text-danger">Could not load form checks: {error}</p>}

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 text-center py-24">
          <ClipboardCheck size={32} className="text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">You're all caught up</p>
          <p className="text-sm text-muted-foreground">New client form checks will appear here for review.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((f) => (
            <Card key={f.id}>
              <CardContent className="pt-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{f.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.exercise_name ?? 'General form check'} · {new Date(f.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={f.status === 'reviewed' ? 'success' : 'outline'}>{f.status}</Badge>
                </div>

                {f.video_key ? <MediaViewer objectKey={f.video_key} /> : <p className="text-xs text-muted-foreground">No video attached.</p>}

                {f.status === 'unreviewed' ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      placeholder="Feedback for this form check..."
                      value={notesDraft[f.id] ?? ''}
                      onChange={(e) => setNotesDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => void handleReview(f.id)}
                      className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      Mark reviewed
                    </button>
                  </div>
                ) : (
                  f.coach_notes && <p className="text-sm text-foreground bg-background border border-border rounded-lg p-2.5">{f.coach_notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
