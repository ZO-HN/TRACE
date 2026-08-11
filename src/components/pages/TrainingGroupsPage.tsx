import { useEffect, useState } from 'react';
import { Plus, Trash2, UsersRound, X } from 'lucide-react';
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
import { useTrainingGroups, type TrainingGroupRow } from '@/hooks/useTrainingGroups';
import { useClients } from '@/hooks/useClients';
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

function ManageMembersDialog({
  group,
  onOpenChange,
  clients,
  fetchMemberIds,
  addMember,
  removeMember,
}: {
  group: TrainingGroupRow | null;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; first_name: string; last_name: string }[];
  fetchMemberIds: (groupId: string) => Promise<{ memberIds: string[]; error: string | null }>;
  addMember: (groupId: string, clientId: string) => Promise<{ error: string | null }>;
  removeMember: (groupId: string, clientId: string) => Promise<{ error: string | null }>;
}) {
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!group) return;
    setIsLoading(true);
    void fetchMemberIds(group.id).then(({ memberIds: ids }) => {
      setMemberIds(new Set(ids));
      setIsLoading(false);
    });
  }, [group, fetchMemberIds]);

  const toggle = async (clientId: string, isMember: boolean) => {
    if (!group) return;
    setPendingId(clientId);
    const { error } = isMember ? await removeMember(group.id, clientId) : await addMember(group.id, clientId);
    if (!error) {
      setMemberIds((prev) => {
        const next = new Set(prev);
        if (isMember) next.delete(clientId);
        else next.add(clientId);
        return next;
      });
    }
    setPendingId(null);
  };

  return (
    <Dialog open={!!group} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Members — {group?.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No clients yet.</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
            {clients.map((c) => {
              const isMember = memberIds.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={pendingId === c.id}
                  onClick={() => void toggle(c.id, isMember)}
                  className="flex items-center justify-between h-11 px-3 rounded-lg hover:bg-background text-left disabled:opacity-50"
                >
                  <span className="text-sm text-foreground">
                    {c.first_name} {c.last_name}
                  </span>
                  {isMember ? (
                    <span className="flex items-center gap-1 text-xs text-danger">
                      <X size={12} /> Remove
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <Plus size={12} /> Add
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function TrainingGroupsPage() {
  const profile = useProfile();
  const { programs } = usePrograms(profile.id);
  const { groups, isLoading, error, createGroup, deleteGroup, fetchMemberIds, addMember, removeMember } =
    useTrainingGroups(profile.id);
  const { clients } = useClients(profile.id);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [managingGroup, setManagingGroup] = useState<TrainingGroupRow | null>(null);

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManagingGroup(g)}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-background"
                >
                  <UsersRound size={12} /> Manage Members
                </button>
                <button
                  onClick={() => void deleteGroup(g.id)}
                  className="text-muted-foreground hover:text-danger p-1.5 rounded-md hover:bg-background"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateGroupDialog open={open} onOpenChange={setOpen} programs={programs} onCreate={handleCreate} />
      <ManageMembersDialog
        group={managingGroup}
        onOpenChange={(isOpen) => !isOpen && setManagingGroup(null)}
        clients={clients}
        fetchMemberIds={fetchMemberIds}
        addMember={addMember}
        removeMember={removeMember}
      />
    </div>
  );
}
