import { useMemo, useState } from 'react';
import { Check, Download, Plus, Settings2, Utensils, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/shadcn/card';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadcn/popover';
import { useProfile } from '@/components/layout/AppShell';
import { useClients } from '@/hooks/useClients';
import { useFoods, type FoodRow } from '@/hooks/useFoods';
import { useMeals, type MealRow } from '@/hooks/useMeals';
import { useToast } from '@/components/ui/toast';
import { downloadCsv } from '@/lib/csv';

type ColumnKey = 'category' | 'date' | 'calories' | 'protein' | 'carbs' | 'fat' | 'items';

const TOGGLE_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'date', label: 'Date' },
  { key: 'calories', label: 'Calories' },
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'items', label: 'Items' },
];

function ViewMenu({ visible, onToggle }: { visible: Set<ColumnKey>; onToggle: (key: ColumnKey) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors"
        >
          <Settings2 size={14} /> View
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1.5">
          Toggle columns
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

interface MealTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function mealTotals(meal: MealRow, foodsById: Map<string, FoodRow>): MealTotals {
  return meal.food_ids.reduce<MealTotals>(
    (acc, id) => {
      const food = foodsById.get(id);
      if (!food) return acc;
      return {
        calories: acc.calories + (food.calories ?? 0),
        protein: acc.protein + (food.protein_g ?? 0),
        carbs: acc.carbs + (food.carbs_g ?? 0),
        fat: acc.fat + (food.fat_g ?? 0),
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function MealsList({
  meals,
  clientNameById,
  foodsById,
}: {
  meals: MealRow[];
  clientNameById: Map<string, string>;
  foodsById: Map<string, FoodRow>;
}) {
  const { toast } = useToast();
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

  const activeColumns = TOGGLE_COLUMNS.filter((c) => visibleColumns.has(c.key));
  const gridStyle = { gridTemplateColumns: `repeat(${2 + activeColumns.length}, minmax(0,1fr))` };

  const handleExport = () => {
    const rows = [
      ['Client', 'Label', 'Category', 'Date', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Items'],
      ...meals.map((m) => {
        const totals = mealTotals(m, foodsById);
        return [
          clientNameById.get(m.client_id ?? '') ?? 'Unknown',
          m.label ?? '',
          m.category ?? '',
          m.consumed_at ? new Date(m.consumed_at).toLocaleString() : '',
          String(totals.calories),
          String(totals.protein),
          String(totals.carbs),
          String(totals.fat),
          String(m.food_ids.length),
        ];
      }),
    ];
    downloadCsv(`meals-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast(`Exported ${meals.length} meal${meals.length === 1 ? '' : 's'}.`);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-foreground text-sm font-semibold">Logged meals</CardTitle>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={meals.length === 0}
            onClick={handleExport}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors disabled:opacity-40"
          >
            <Download size={14} /> Export
          </button>
          <ViewMenu visible={visibleColumns} onToggle={toggleColumn} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {meals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Utensils size={24} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No meals logged yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid gap-3 px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground" style={gridStyle}>
              <span>Client</span>
              <span>Label</span>
              {activeColumns.map((c) => (
                <span key={c.key}>{c.label}</span>
              ))}
            </div>
            {meals.map((m) => {
              const totals = mealTotals(m, foodsById);
              return (
                <div key={m.id} className="grid gap-3 px-3 py-2 border-b border-border last:border-b-0 text-sm items-center" style={gridStyle}>
                  <span className="text-foreground font-medium truncate">
                    {clientNameById.get(m.client_id ?? '') ?? 'Unknown'}
                  </span>
                  <span className="text-muted-foreground truncate">{m.label || '—'}</span>
                  {visibleColumns.has('category') && (
                    <span className="text-muted-foreground capitalize">{m.category || '—'}</span>
                  )}
                  {visibleColumns.has('date') && (
                    <span className="text-muted-foreground">
                      {m.consumed_at ? new Date(m.consumed_at).toLocaleDateString() : '—'}
                    </span>
                  )}
                  {visibleColumns.has('calories') && <span className="text-muted-foreground">{totals.calories} kcal</span>}
                  {visibleColumns.has('protein') && <span className="text-muted-foreground">{totals.protein}g</span>}
                  {visibleColumns.has('carbs') && <span className="text-muted-foreground">{totals.carbs}g</span>}
                  {visibleColumns.has('fat') && <span className="text-muted-foreground">{totals.fat}g</span>}
                  {visibleColumns.has('items') && <span className="text-muted-foreground">{m.food_ids.length}</span>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MealsPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const { clients } = useClients(profile.id);
  const { foods } = useFoods(profile.id);
  const { meals, createMeal } = useMeals(profile.id);

  const clientNameById = useMemo(
    () => new Map(clients.map((c) => [c.id, `${c.first_name} ${c.last_name}`])),
    [clients],
  );
  const foodsById = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);

  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState('');
  const [consumedAt, setConsumedAt] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [foodIds, setFoodIds] = useState<string[]>([]);
  const [foodToAdd, setFoodToAdd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFood = () => {
    if (!foodToAdd) return;
    setFoodIds((f) => [...f, foodToAdd]);
    setFoodToAdd('');
  };

  const handleCreate = async () => {
    setSubmitting(true);
    const { error: submitError } = await createMeal({ clientId, category, label, consumedAt, notes, foodIds });
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    toast('Meal created.');
    setClientId('');
    setCategory('');
    setConsumedAt('');
    setLabel('');
    setNotes('');
    setFoodIds([]);
  };

  const handleCancel = () => {
    setClientId('');
    setCategory('');
    setConsumedAt('');
    setLabel('');
    setNotes('');
    setFoodIds([]);
    setError(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-5">
      <h1 className="text-xl font-bold text-foreground">Meals</h1>

      <MealsList meals={meals} clientNameById={clientNameById} foodsById={foodsById} />

      <h2 className="text-lg font-bold text-foreground -mb-1">Create New Meal</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>
              Client <span className="text-danger">*</span>
            </Label>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="" disabled>
                Select a client...
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="" disabled>
                  Select...
                </option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Consumed <span className="text-danger">*</span>
              </Label>
              <Input type="datetime-local" value={consumedAt} onChange={(e) => setConsumedAt(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Label</Label>
            <Input placeholder="Auto-generated from foods if left blank" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Foods</CardTitle>
          <div className="flex items-center gap-2">
            <Select className="h-8 w-40 text-xs" value={foodToAdd} onChange={(e) => setFoodToAdd(e.target.value)}>
              <option value="">Pick a food</option>
              {foods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={addFood}
              disabled={!foodToAdd}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-surface transition-colors disabled:opacity-40"
            >
              <Plus size={12} /> Add Food
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {foodIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No foods added yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {foodIds.map((id, i) => {
                const food = foods.find((f) => f.id === id);
                return (
                  <li
                    key={`${id}-${i}`}
                    className="flex items-center justify-between text-sm text-foreground bg-background border border-border rounded-lg px-3 py-2"
                  >
                    {food?.name ?? 'Unknown food'}
                    <button onClick={() => setFoodIds((fs) => fs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-danger">
                      <X size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          disabled={!clientId || !consumedAt || submitting}
          onClick={() => void handleCreate()}
          className="h-11 px-6 rounded-lg bg-success text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {submitting ? 'Creating...' : 'Create Meal'}
        </button>
        <button
          onClick={handleCancel}
          className="h-11 px-6 rounded-lg border border-border text-foreground font-semibold hover:bg-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
