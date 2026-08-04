import { useState } from 'react';
import { Map, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';

function CreateRoadmapDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState('');

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
          <Textarea placeholder="Optional description" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Client</Label>
          <Select defaultValue="">
            <option value="" disabled>
              Select a client
            </option>
          </Select>
          <p className="text-xs text-muted-foreground">
            The client will be prompted to accept this roadmap from their mobile app before it goes live.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Start Date</Label>
            <Input type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Target End Date</Label>
            <Input type="date" />
          </div>
        </div>

        <button
          type="button"
          disabled={!title.trim()}
          className="h-11 rounded-lg bg-success text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Create Roadmap
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function RoadmapsPage() {
  const [open, setOpen] = useState(false);

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

      <div className="flex flex-col items-center justify-center gap-2 text-center py-24 rounded-xl border border-border bg-card">
        <Map size={32} className="text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">No roadmaps yet</p>
        <p className="text-sm text-muted-foreground">Create a roadmap to guide a client's long-term training.</p>
      </div>

      <CreateRoadmapDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
