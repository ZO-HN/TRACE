import { useState } from 'react';
import { Plus, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';

function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');

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
          <Textarea placeholder="What this group is for" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Shared program</Label>
          <Select defaultValue="">
            <option value="" disabled>
              Select a program
            </option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Members of this group can be assigned this program in one step.
          </p>
        </div>

        <button
          type="button"
          disabled={!name.trim()}
          className="h-11 rounded-lg bg-success text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Create Group
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function TrainingGroupsPage() {
  const [open, setOpen] = useState(false);

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

      <div className="flex flex-col items-center justify-center gap-2 text-center py-24 rounded-xl border border-border bg-card">
        <UsersRound size={32} className="text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">No training groups yet</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Create a group to coach multiple clients together with a shared plan.
        </p>
      </div>

      <CreateGroupDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
