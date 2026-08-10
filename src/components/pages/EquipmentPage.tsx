import { useState } from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Select } from '@/components/ui/shadcn/field';
import { useProfile } from '@/components/layout/AppShell';
import { useEquipment } from '@/hooks/useEquipment';
import { useToast } from '@/components/ui/toast';

const categories = ['Free weights', 'Machines', 'Cardio', 'Bodyweight', 'Bands & Mobility', 'Other'];

function NewEquipmentDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, category: string) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSubmitting(true);
    const { error: submitError } = await onCreate(name, category);
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setName('');
    setCategory('');
    onOpenChange(false);
  };

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
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
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

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="button"
          disabled={!name.trim() || submitting}
          onClick={() => void handleSave()}
          className="h-11 rounded-lg bg-success text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {submitting ? 'Saving...' : 'Save Equipment'}
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function EquipmentPage() {
  const profile = useProfile();
  const { equipment, isLoading, error, createEquipment, deleteEquipment } = useEquipment(profile.id);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleCreate = async (name: string, category: string) => {
    const result = await createEquipment({ name, category });
    if (!result.error) toast('Equipment added.');
    return result;
  };

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

      {error && <p className="text-sm text-danger">Could not load equipment: {error}</p>}

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading...</div>
      ) : equipment.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 text-center py-24 rounded-xl border border-border bg-card">
          <Wrench size={32} className="text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">No equipment yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Add equipment to your library and tag it to gyms your clients train at.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {equipment.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.category ?? 'Uncategorized'}</p>
              </div>
              <button
                onClick={() => void deleteEquipment(e.id)}
                className="text-muted-foreground hover:text-danger p-1.5 rounded-md hover:bg-background"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <NewEquipmentDialog open={open} onOpenChange={setOpen} onCreate={handleCreate} />
    </div>
  );
}
