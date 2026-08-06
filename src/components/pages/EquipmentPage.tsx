import { useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Select } from '@/components/ui/shadcn/field';

const categories = ['Free weights', 'Machines', 'Cardio', 'Bodyweight', 'Bands & Mobility', 'Other'];

function NewEquipmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Equipment</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Name</Label>
          <Input placeholder="e.g. Adjustable Dumbbells" value={name} onChange={(e) => setName(e.target.value)} />
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

        <div className="flex flex-col gap-1.5">
          <Label>Gym (optional)</Label>
          <Select defaultValue="">
            <option value="" disabled>
              Select a gym
            </option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Tag equipment to a gym so exercises can be filtered by what's available.
          </p>
        </div>

        <button
          type="button"
          disabled={!name.trim()}
          className="h-11 rounded-lg bg-success text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Save Equipment
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function EquipmentPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Equipment</h1>
          <Badge variant="success">Beta</Badge>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Equipment
        </button>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Track available equipment so exercises can be matched to what your clients have access to.
      </p>

      <div className="flex flex-col items-center justify-center gap-2 text-center py-24 rounded-xl border border-border bg-card">
        <Wrench size={32} className="text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">No equipment yet</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Add equipment to your library and tag it to gyms your clients train at.
        </p>
      </div>

      <NewEquipmentDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
