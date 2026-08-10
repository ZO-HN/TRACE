import { useState } from 'react';
import { ArrowUpDown, ClipboardList, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';
import { useProfile } from '@/components/layout/AppShell';
import { usePrograms } from '@/hooks/usePrograms';
import { useToast } from '@/components/ui/toast';

const columns = ['Title', 'Category', 'Created At'];
const categories = [
  'Academic', 'Adventure Race', 'Archery', 'Baseball', 'Basketball', 'Bodybuilding', 'Boxing', 'Combat Sports', 'Cross Country',
];

function CreateProgramDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description: string, category: string) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSubmitting(true);
    const { error: submitError } = await onCreate(name, description, category);
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setName('');
    setDescription('');
    setCategory('');
    onOpenChange(false);
  };

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
          <Textarea placeholder="Add program description" value={description} onChange={(e) => setDescription(e.target.value)} />
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
          {submitting ? 'Saving...' : 'Save Program'}
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function ProgramsPage() {
  const profile = useProfile();
  const { programs, isLoading, error, createProgram, deleteProgram } = usePrograms(profile.id);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleCreate = async (name: string, description: string, category: string) => {
    const result = await createProgram({ name, description, category });
    if (!result.error) toast('Program created.');
    return result;
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Programs</h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Program
        </button>
      </div>

      {error && <p className="text-sm text-danger">Could not load programs: {error}</p>}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground">
          {columns.map((c) => (
            <span key={c} className="flex items-center gap-1">
              {c} <ArrowUpDown size={12} />
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
        ) : programs.length === 0 ? (
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
        ) : (
          programs.map((p) => (
            <div key={p.id} className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-border last:border-b-0 items-center text-sm">
              <div>
                <p className="font-medium text-foreground">{p.name}</p>
                {p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}
              </div>
              <span className="text-muted-foreground">{p.category ?? '—'}</span>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                <button
                  onClick={() => void deleteProgram(p.id)}
                  className="text-muted-foreground hover:text-danger p-1.5 rounded-md hover:bg-background"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateProgramDialog open={open} onOpenChange={setOpen} onCreate={handleCreate} />
    </div>
  );
}
