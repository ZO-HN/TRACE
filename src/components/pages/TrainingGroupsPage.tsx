import { useState } from 'react';
import { Plus, Trash2, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';
import { useProfile } from '@/components/layout/AppShell';
import { usePrograms } from '@/hooks/usePrograms';
import { useTrainingGroups } from '@/hooks/useTrainingGroups';
import { useToast } from '@/components/ui/toast';

function CreateGroupDialog({
  open,
  onOpenChange,
  programs,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: { id: string; name: string }[];
  onCreate: (input: { name: string; description: string; programId: string }) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSubmitting(true);
    const { error: submitError } = await onCreate({ name, description, programId });
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setName('');
    setDescription('');
    setProgramId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Training Group</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Group name</Label>
          <Input placeholder="e.g. Morning Bootcamp" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Description (optional)</Label>
          <Textarea placeholder="What this group is for" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Shared program</Label>
          <Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
            <option value="">No program selected</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Members of this group can be assigned this program in one step.
          </p>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="button"
          disabled={!name.trim() || submitting}
          onClick={() => void handleSave()}
          className="h-11 rounded-lg bg-success text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {submitting ? 'Creating...' : 'Create Group'}
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function TrainingGroupsPage() {
  const profile = useProfile();
  const { programs } = usePrograms(profile.id);
  const { groups, isLoading, error, createGroup, deleteGroup } = useTrainingGroups(profile.id);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleCreate: typeof createGroup = async (input) => {
    const result = await createGroup(input);
    if (!result.error) toast('Training group created.');
    return result;
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Training Groups</h1>
          <Badge variant="success">Beta</Badge>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Training Group
        </button>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Group clients together to share programs, announcements, and check-ins.
      </p>

      {error && <p className="text-sm text-danger">Could not load training groups: {error}</p>}

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading...</div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 text-center py-24 rounded-xl border border-border bg-card">
          <UsersRound size={32} className="text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">No training groups yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Create a group to coach multiple clients together with a shared plan.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.member_count} member{g.member_count === 1 ? '' : 's'}
                  {g.program_name && ` · ${g.program_name}`}
                </p>
              </div>
              <button
                onClick={() => void deleteGroup(g.id)}
                className="text-muted-foreground hover:text-danger p-1.5 rounded-md hover:bg-background"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateGroupDialog open={open} onOpenChange={setOpen} programs={programs} onCreate={handleCreate} />
    </div>
  );
}
