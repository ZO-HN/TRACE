import { useState } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';
import { useProfile } from '@/components/layout/AppShell';
import { useClients } from '@/hooks/useClients';
import { useVaultFolders } from '@/hooks/useVaultFolders';
import { useToast } from '@/components/ui/toast';

function CreateFolderDialog({
  open,
  onOpenChange,
  clients,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; first_name: string; last_name: string }[];
  onCreate: (input: { name: string; description: string; visibility: 'all' | 'specific'; clientIds: string[] }) => Promise<{
    error: string | null;
  }>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'specific'>('all');
  const [clientId, setClientId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim() && (visibility === 'all' || clientId);

  const handleSave = async () => {
    setSubmitting(true);
    const { error: submitError } = await onCreate({
      name,
      description,
      visibility,
      clientIds: visibility === 'specific' && clientId ? [clientId] : [],
    });
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setName('');
    setDescription('');
    setVisibility('all');
    setClientId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create folder</DialogTitle>
          <DialogDescription>Group educational resources for your clients.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Name</Label>
          <Input placeholder="e.g. Mobility routines" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Description (optional)</Label>
          <Textarea placeholder="What clients will find here" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Who can see this folder</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVisibility('all')}
              className={cn(
                'h-9 px-4 rounded-lg text-sm font-semibold transition-colors',
                visibility === 'all' ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground',
              )}
            >
              All clients
            </button>
            <button
              type="button"
              onClick={() => setVisibility('specific')}
              className={cn(
                'h-9 px-4 rounded-lg text-sm font-semibold transition-colors',
                visibility === 'specific' ? 'bg-success text-white' : 'border border-border text-muted-foreground hover:text-foreground',
              )}
            >
              Specific clients
            </button>
          </div>
          {visibility === 'specific' && (
            <>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="" disabled>
                  Select clients
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </Select>
              {!clientId && (
                <p className="text-xs text-danger">
                  Select at least one client, or switch to "All clients", before creating this folder.
                </p>
              )}
            </>
          )}
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
            disabled={!canSave || submitting}
            onClick={() => void handleSave()}
            className="h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VaultPage() {
  const profile = useProfile();
  const { clients } = useClients(profile.id);
  const { folders, isLoading, error, createFolder, deleteFolder } = useVaultFolders(profile.id);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleCreate: typeof createFolder = async (input) => {
    const result = await createFolder(input);
    if (!result.error) toast('Folder created.');
    return result;
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Vault</h1>
          <p className="text-sm text-muted-foreground">
            Build an education hub of folders, files, and links your clients can access anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New folder
        </button>
      </div>

      {error && <p className="text-sm text-danger">Could not load folders: {error}</p>}

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading...</div>
      ) : folders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 text-center py-24 rounded-xl border border-border bg-card">
          <Lock size={32} className="text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">No folders yet</p>
          <p className="text-sm text-muted-foreground">Create a folder to start building your resource library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {folders.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock size={15} className="text-primary" />
                </div>
                <button
                  onClick={() => void deleteFolder(f.id)}
                  className="text-muted-foreground hover:text-danger p-1.5 rounded-md hover:bg-background"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-sm font-semibold text-foreground">{f.name}</p>
              {f.description && <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>}
              <p className="text-[11px] text-muted-foreground">
                {f.visibility === 'all' ? 'All clients' : `${f.client_ids.length} client(s)`}
              </p>
            </div>
          ))}
        </div>
      )}

      <CreateFolderDialog open={open} onOpenChange={setOpen} clients={clients} onCreate={handleCreate} />
    </div>
  );
}
