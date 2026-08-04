import { useState } from 'react';
import { Lock, Plus } from 'lucide-react';
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

function CreateFolderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'specific'>('all');

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
          <Textarea placeholder="What clients will find here" />
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
              <Select defaultValue="">
                <option value="" disabled>
                  Select clients
                </option>
              </Select>
              <p className="text-xs text-danger">
                Select at least one client, or switch to "All clients", before creating this folder.
              </p>
            </>
          )}
        </div>

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
            disabled={!name.trim() || visibility === 'specific'}
            className="h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Create
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VaultPage() {
  const [open, setOpen] = useState(false);

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

      <div className="flex flex-col items-center justify-center gap-2 text-center py-24 rounded-xl border border-border bg-card">
        <Lock size={32} className="text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">No folders yet</p>
        <p className="text-sm text-muted-foreground">Create a folder to start building your resource library.</p>
      </div>

      <CreateFolderDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
