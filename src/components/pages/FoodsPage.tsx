import { useState } from 'react';
import { Apple, Check, ChefHat, Download, Plus, Settings2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea } from '@/components/ui/shadcn/field';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadcn/popover';
import { useProfile } from '@/components/layout/AppShell';
import { useFoods } from '@/hooks/useFoods';
import { useToast } from '@/components/ui/toast';
import { downloadCsv } from '@/lib/csv';

type ColumnKey = 'serving' | 'macros' | 'recipe';

const TOGGLE_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'serving', label: 'Serving & calories' },
  { key: 'macros', label: 'Macros' },
  { key: 'recipe', label: 'Recipe badge' },
];

function ViewMenu({ visible, onToggle }: { visible: Set<ColumnKey>; onToggle: (key: ColumnKey) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors"
        >
          <Settings2 size={14} /> View
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1.5">
          Toggle fields shown
        </p>
        {TOGGLE_COLUMNS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onToggle(c.key)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors"
          >
            <span className={`w-4 shrink-0 ${visible.has(c.key) ? 'text-primary' : 'text-transparent'}`}>
              <Check size={14} />
            </span>
            {c.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function NewFoodDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    name: string;
    servingSize: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    recipe: string;
  }) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [hasRecipe, setHasRecipe] = useState(false);
  const [recipe, setRecipe] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSubmitting(true);
    const { error: submitError } = await onCreate({
      name,
      servingSize,
      calories,
      protein,
      carbs,
      fat,
      recipe: hasRecipe ? recipe : '',
    });
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setName('');
    setServingSize('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setHasRecipe(false);
    setRecipe('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Food</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Name</Label>
          <Input placeholder="e.g. Grilled chicken breast" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Serving size</Label>
            <Input placeholder="e.g. 100g" value={servingSize} onChange={(e) => setServingSize(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Calories</Label>
            <Input type="number" placeholder="0" value={calories} onChange={(e) => setCalories(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Protein (g)</Label>
            <Input type="number" placeholder="0" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Carbs (g)</Label>
            <Input type="number" placeholder="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fat (g)</Label>
            <Input type="number" placeholder="0" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="accent-primary"
            checked={hasRecipe}
            onChange={(e) => setHasRecipe(e.target.checked)}
          />
          This food has a recipe
        </label>

        {hasRecipe && (
          <div className="flex flex-col gap-1.5">
            <Label>Recipe description</Label>
            <Textarea placeholder="Ingredients and preparation steps" value={recipe} onChange={(e) => setRecipe(e.target.value)} />
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="button"
          disabled={!name.trim() || submitting}
          onClick={() => void handleSave()}
          className="h-11 rounded-lg bg-success text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {submitting ? 'Saving...' : 'Save Food'}
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function FoodsPage() {
  const profile = useProfile();
  const { foods, isLoading, error, createFood, deleteFood } = useFoods(profile.id);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(TOGGLE_COLUMNS.map((c) => c.key)),
  );

  const toggleColumn = (key: ColumnKey) =>
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleCreate: typeof createFood = async (input) => {
    const result = await createFood(input);
    if (!result.error) toast('Food added.');
    return result;
  };

  const handleExport = () => {
    const rows = [
      ['Name', 'Serving size', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Has recipe'],
      ...foods.map((f) => [
        f.name,
        f.serving_size ?? '',
        f.calories != null ? String(f.calories) : '',
        f.protein_g != null ? String(f.protein_g) : '',
        f.carbs_g != null ? String(f.carbs_g) : '',
        f.fat_g != null ? String(f.fat_g) : '',
        f.recipe ? 'Yes' : 'No',
      ]),
    ];
    downloadCsv(`foods-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast(`Exported ${foods.length} food${foods.length === 1 ? '' : 's'}.`);
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Foods</h1>
          <p className="text-sm text-muted-foreground">
            Your food library — any food can optionally include a recipe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={foods.length === 0}
            onClick={handleExport}
            className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors disabled:opacity-40"
          >
            <Download size={14} /> Export
          </button>
          <ViewMenu visible={visibleColumns} onToggle={toggleColumn} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> New Food
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">Could not load foods: {error}</p>}

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading...</div>
      ) : foods.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Apple size={28} />
            <ChefHat size={28} />
          </div>
          <p className="text-sm font-semibold text-foreground">No foods yet</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Add foods to your library. Give any food a recipe description to turn it into a full dish.
          </p>
          <Badge variant="outline" className="mt-1">
            Recipes now live inside Foods
          </Badge>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {foods.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1.5">
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-foreground">{f.name}</p>
                <button
                  onClick={() => void deleteFood(f.id)}
                  className="text-muted-foreground hover:text-danger p-1 rounded-md hover:bg-background shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {visibleColumns.has('serving') && (
                <p className="text-xs text-muted-foreground">
                  {f.serving_size ?? '—'} {f.calories != null && `· ${f.calories} kcal`}
                </p>
              )}
              {visibleColumns.has('macros') && (
                <p className="text-xs text-muted-foreground">
                  {f.protein_g ?? 0}g P · {f.carbs_g ?? 0}g C · {f.fat_g ?? 0}g F
                </p>
              )}
              {visibleColumns.has('recipe') && f.recipe && <Badge variant="outline">Has recipe</Badge>}
            </div>
          ))}
        </div>
      )}

      <NewFoodDialog open={open} onOpenChange={setOpen} onCreate={handleCreate} />
    </div>
  );
}
