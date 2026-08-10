import { useState } from 'react';
import { Map, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';
import { Badge } from '@/components/ui/shadcn/badge';
import { useProfile } from '@/components/layout/AppShell';
import { useClients } from '@/hooks/useClients';
import { useRoadmaps } from '@/hooks/useRoadmaps';
import { useToast } from '@/components/ui/toast';

function CreateRoadmapDialog({
  open,
  onOpenChange,
  clients,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; first_name: string; last_name: string }[];
  onCreate: (input: {
    title: string;
    description: string;
    clientId: string;
    status: 'draft' | 'active';
    startDate: string;
    targetEndDate: string;
  }) => Promise<{ error: string | null }>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [startDate, setStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSubmitting(true);
    const { error: submitError } = await onCreate({ title, description, clientId, status, startDate, targetEndDate });
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setTitle('');
    setDescription('');
    setClientId('');
    setStatus('draft');
    setStartDate('');
    setTargetEndDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Roadmap</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Title</Label>
          <Input placeholder="Roadmap title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Description</Label>
          <Textarea placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Client</Label>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">No client selected</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            The client will be prompted to accept this roadmap from their mobile app before it goes live.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'active')}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Target End Date</Label>
            <Input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="button"
          disabled={!title.trim() || submitting}
          onClick={() => void handleSave()}
          className="h-11 rounded-lg bg-success text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {submitting ? 'Creating...' : 'Create Roadmap'}
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function RoadmapsPage() {
  const profile = useProfile();
  const { clients } = useClients(profile.id);
  const { roadmaps, isLoading, error, createRoadmap, deleteRoadmap } = useRoadmaps(profile.id);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleCreate: typeof createRoadmap = async (input) => {
    const result = await createRoadmap(input);
    if (!result.error) toast('Roadmap created.');
    return result;
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Roadmaps</h1>
          <p className="text-sm text-muted-foreground">Training roadmaps for your clients.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Roadmap
        </button>
      </div>

      {error && <p className="text-sm text-danger">Could not load roadmaps: {error}</p>}

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading...</div>
      ) : roadmaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 text-center py-24 rounded-xl border border-border bg-card">
          <Map size={32} className="text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">No roadmaps yet</p>
          <p className="text-sm text-muted-foreground">Create a roadmap to guide a client's long-term training.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {roadmaps.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <Badge variant={r.status === 'active' ? 'success' : 'outline'}>{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.client_name ?? 'No client assigned'}
                  {r.start_date && ` · ${r.start_date} → ${r.target_end_date ?? '—'}`}
                </p>
              </div>
              <button
                onClick={() => void deleteRoadmap(r.id)}
                className="text-muted-foreground hover:text-danger p-1.5 rounded-md hover:bg-background"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateRoadmapDialog open={open} onOpenChange={setOpen} clients={clients} onCreate={handleCreate} />
    </div>
  );
}
