import { useState } from 'react';
import { ArrowUpDown, ClipboardList, Plus, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';

const columns = ['Title', 'Creator', 'Created At', 'Enrolled'];
const categories = [
  'Academic', 'Adventure Race', 'Archery', 'Baseball', 'Basketball', 'Bodybuilding', 'Boxing', 'Combat Sports', 'Cross Country',
];

function CreateProgramDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Program</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Program Name</Label>
          <Input placeholder="Add program name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Program Description</Label>
          <Textarea placeholder="Add program description" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Category</Label>
          <Select defaultValue="">
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <button
          type="button"
          disabled={!name.trim()}
          className="h-11 rounded-lg bg-success text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Save Program
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function ProgramsPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Programs</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> New Program
          </button>
          <button className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors">
            <Settings2 size={14} /> View
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground">
          {columns.map((c) => (
            <span key={c} className="flex items-center gap-1">
              {c} <ArrowUpDown size={12} />
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
          <ClipboardList size={32} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Create your first program</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Programs get assigned to clients to guide their training — build one from scratch or start light and expand later.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity mt-1"
          >
            Create program
          </button>
        </div>
      </div>

      <CreateProgramDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
