import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Flame, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Label, Input, Select } from '@/components/ui/shadcn/field';
import { useProfile } from '@/components/layout/AppShell';
import { useClients } from '@/hooks/useClients';
import { useMealPlans } from '@/hooks/useMealPlans';
import { useFoods, type FoodRow } from '@/hooks/useFoods';
import { useToast } from '@/components/ui/toast';

interface PlanFoodRow {
  rowId: string;
  foodId: string | null;
  query: string;
  servings: string;
}

function emptyRow(): PlanFoodRow {
  return { rowId: crypto.randomUUID(), foodId: null, query: '', servings: '1' };
}

interface MealBlock {
  id: string;
  name: string;
  rows: PlanFoodRow[];
}

interface DayBlock {
  id: string;
  label: string;
  meals: MealBlock[];
}

function emptyMeal(name: string): MealBlock {
  return { id: crypto.randomUUID(), name, rows: [emptyRow()] };
}

function emptyDay(label: string): DayBlock {
  return { id: crypto.randomUUID(), label, meals: [emptyMeal('Meal 1')] };
}

function computeTotals(rows: PlanFoodRow[], byId: Map<string, FoodRow>) {
  return rows.reduce(
    (acc, r) => {
      const f = r.foodId ? byId.get(r.foodId) : null;
      const servings = Number(r.servings) || 0;
      if (!f) return acc;
      return {
        calories: acc.calories + (f.calories ?? 0) * servings,
        protein_g: acc.protein_g + (f.protein_g ?? 0) * servings,
        carbs_g: acc.carbs_g + (f.carbs_g ?? 0) * servings,
        fat_g: acc.fat_g + (f.fat_g ?? 0) * servings,
      };
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

function FoodRowInput({
  row,
  foods,
  onChange,
  onRemove,
}: {
  row: PlanFoodRow;
  foods: FoodRow[];
  onChange: (next: PlanFoodRow) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = foods.find((f) => f.id === row.foodId) ?? null;

  const matches =
    open && row.query.trim() && !selected
      ? foods.filter((f) => f.name.toLowerCase().includes(row.query.trim().toLowerCase())).slice(0, 8)
      : [];

  const servingsNum = Number(row.servings) || 0;
  const scaled = (v: number | null) => (selected && v != null ? Math.round(v * servingsNum * 10) / 10 : null);

  return (
    <div className="grid grid-cols-[1fr_60px_repeat(6,60px)_24px] items-center gap-2 px-3 py-1.5 text-xs relative">
      <div className="relative">
        <Input
          placeholder="Search foods..."
          className="h-8 text-xs"
          value={selected ? selected.name : row.query}
          onChange={(e) => {
            onChange({ ...row, query: e.target.value, foodId: null });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
        {matches.length > 0 && (
          <div className="absolute z-10 top-full left-0 mt-1 w-56 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {matches.map((f) => (
              <button
                key={f.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ ...row, foodId: f.id, query: f.name });
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-background text-foreground"
              >
                {f.name}
                {f.calories != null && <span className="text-muted-foreground"> · {f.calories} cal</span>}
              </button>
            ))}
          </div>
        )}
        {open && row.query.trim() && !selected && matches.length === 0 && (
          <p className="absolute z-10 top-full left-0 mt-1 text-[11px] text-muted-foreground bg-card border border-border rounded-lg px-3 py-1.5">
            No matching foods — add it on the Foods page first.
          </p>
        )}
      </div>
      <Input
        type="number"
        min="0"
        step="0.5"
        className="h-8 text-xs text-center"
        value={row.servings}
        onChange={(e) => onChange({ ...row, servings: e.target.value })}
        disabled={!selected}
      />
      {(['calories', 'protein_g', 'carbs_g', 'fat_g'] as const).map((k) => (
        <span key={k} className="text-center text-muted-foreground">
          {scaled(selected?.[k] ?? null) ?? '—'}
        </span>
      ))}
      <span className="text-center text-muted-foreground">—</span>
      <span className="text-center text-muted-foreground">—</span>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-danger">
        <X size={13} />
      </button>
    </div>
  );
}

const GOAL_ADJUSTMENT: Record<'Maintain' | 'Cut' | 'Surplus' | 'Manual', number> = {
  Maintain: 0,
  Cut: -500,
  Surplus: 300,
  Manual: 0,
};

function mifflinStJeor(sex: string, ageYrs: number, heightCm: number, weightKg: number): number | null {
  if (!ageYrs || !heightCm || !weightKg) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYrs;
  if (sex === 'male') return Math.round(base + 5);
  if (sex === 'female') return Math.round(base - 161);
  return Math.round(base - 78); // unspecified: midpoint offset
}

const categoryKey = [
  { label: 'Protein', color: '#EF4444' },
  { label: 'Carbs', color: '#F59E0B' },
  { label: 'Fat', color: '#EAB308' },
  { label: 'Vegetables', color: '#10B981' },
  { label: 'Fruit', color: '#A855F7' },
  { label: 'Dairy', color: '#0EA5E9' },
  { label: 'Sauces', color: '#F97316' },
  { label: 'Seasonings', color: '#22C55E' },
  { label: 'Other', color: '#6B7280' },
];

const dayTargets = [
  { label: 'Calories', key: 'cal' },
  { label: 'Protein', key: 'protein' },
  { label: 'Carbs', key: 'carbs' },
  { label: 'Fat', key: 'fat' },
  { label: 'Fiber', key: 'fiber' },
  { label: 'Sodium', key: 'sodium' },
];

function MealPlanBuilder({
  clients,
  onClose,
  onSave,
}: {
  clients: { id: string; first_name: string; last_name: string }[];
  onClose: () => void;
  onSave: (input: { name: string; clientId: string; data: Record<string, unknown> }) => Promise<{ error: string | null }>;
}) {
  const profile = useProfile();
  const { foods } = useFoods(profile.id);
  const [tdeeOpen, setTdeeOpen] = useState(true);
  const [goal, setGoal] = useState<'Maintain' | 'Cut' | 'Surplus' | 'Manual'>('Maintain');
  const [method, setMethod] = useState<'formula' | 'kcal-per-kg'>('formula');
  const firstDay = useRef(emptyDay('Daily')).current;
  const [days, setDays] = useState<DayBlock[]>([firstDay]);
  const [activeDayId, setActiveDayId] = useState(firstDay.id);
  const [clientId, setClientId] = useState('');
  const [sex, setSex] = useState('unspecified');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [kcalPerKg, setKcalPerKg] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [saving, setSaving] = useState(false);

  const maintenanceEstimate = useMemo(
    () => mifflinStJeor(sex, Number(age), Number(heightCm), Number(weightKg)),
    [sex, age, heightCm, weightKg],
  );

  const appliedTarget = useMemo(() => {
    if (goal === 'Manual') return manualCalories ? Number(manualCalories) : null;
    if (method === 'kcal-per-kg' && kcalPerKg && weightKg) {
      return Math.round(Number(kcalPerKg) * Number(weightKg));
    }
    if (maintenanceEstimate == null) return null;
    return maintenanceEstimate + GOAL_ADJUSTMENT[goal];
  }, [goal, method, kcalPerKg, weightKg, maintenanceEstimate, manualCalories]);

  const client = clients.find((c) => c.id === clientId);

  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0];
  const dayTotals = useMemo(() => {
    const rows = activeDay.meals.flatMap((m) => m.rows);
    return computeTotals(rows, byId);
  }, [activeDay, byId]);

  const updateDay = (dayId: string, fn: (d: DayBlock) => DayBlock) =>
    setDays((ds) => ds.map((d) => (d.id === dayId ? fn(d) : d)));

  const addDay = () => {
    const d = emptyDay(`Day ${days.length + 1}`);
    setDays((ds) => [...ds, d]);
    setActiveDayId(d.id);
  };

  const removeDay = (dayId: string) => {
    if (days.length <= 1) return;
    const next = days.filter((d) => d.id !== dayId);
    setDays(next);
    if (activeDayId === dayId) setActiveDayId(next[0].id);
  };

  const renameDay = (dayId: string, label: string) => updateDay(dayId, (d) => ({ ...d, label }));

  const addMeal = (dayId: string) =>
    updateDay(dayId, (d) => ({ ...d, meals: [...d.meals, emptyMeal(`Meal ${d.meals.length + 1}`)] }));

  const removeMeal = (dayId: string, mealId: string) =>
    updateDay(dayId, (d) => (d.meals.length <= 1 ? d : { ...d, meals: d.meals.filter((m) => m.id !== mealId) }));

  const renameMeal = (dayId: string, mealId: string, name: string) =>
    updateDay(dayId, (d) => ({ ...d, meals: d.meals.map((m) => (m.id === mealId ? { ...m, name } : m)) }));

  const addMealRow = (dayId: string, mealId: string) =>
    updateDay(dayId, (d) => ({
      ...d,
      meals: d.meals.map((m) => (m.id === mealId ? { ...m, rows: [...m.rows, emptyRow()] } : m)),
    }));

  const updateMealRow = (dayId: string, mealId: string, rowId: string, next: PlanFoodRow) =>
    updateDay(dayId, (d) => ({
      ...d,
      meals: d.meals.map((m) => (m.id === mealId ? { ...m, rows: m.rows.map((r) => (r.rowId === rowId ? next : r)) } : m)),
    }));

  const removeMealRow = (dayId: string, mealId: string, rowId: string) =>
    updateDay(dayId, (d) => ({
      ...d,
      meals: d.meals.map((m) => (m.id === mealId ? { ...m, rows: m.rows.filter((r) => r.rowId !== rowId) } : m)),
    }));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await onSave({
      name: client ? `${client.first_name}'s plan` : 'Untitled plan',
      clientId,
      data: {
        goal,
        method,
        sex,
        age,
        heightCm,
        weightKg,
        kcalPerKg,
        manualCalories,
        maintenanceEstimate,
        appliedTarget,
        days: days.map((d) => ({
          label: d.label,
          meals: d.meals.map((m) => ({
            name: m.name,
            items: m.rows.filter((r) => r.foodId).map((r) => ({ foodId: r.foodId, servings: Number(r.servings) || 0 })),
          })),
        })),
      },
    });
    setSaving(false);
    if (!error) onClose();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Building for
          <Select className="w-48 h-8" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">No client selected</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </Select>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-surface">
          <X size={16} />
        </button>
      </div>

      <Card>
        <button
          type="button"
          onClick={() => setTdeeOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 pt-5"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Flame size={16} className="text-warning" /> Estimate maintenance calories (TDEE)
          </span>
          {tdeeOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>

        {tdeeOpen && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Sex</Label>
                <Select value={sex} onChange={(e) => setSex(e.target.value)}>
                  <option value="unspecified">Unspecified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Age (yrs)</Label>
                <Input placeholder="—" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Height (cm)</Label>
                <Input placeholder="—" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Weight (kg)</Label>
                <Input placeholder="—" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground -mt-2">
              Calculated with the Mifflin-St Jeor formula. Every field is editable.
            </p>

            <div className="rounded-lg border border-border-soft bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide">MAINTENANCE ESTIMATE (FORMULA)</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {maintenanceEstimate != null ? `${maintenanceEstimate} kcal` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {maintenanceEstimate != null ? 'Estimated basal + light activity maintenance.' : 'Enter age, height, and weight to estimate — or set calories manually below.'}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Goal</Label>
              <div className="inline-flex w-fit rounded-lg bg-muted p-1 text-sm">
                {(['Maintain', 'Cut', 'Surplus', 'Manual'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoal(g)}
                    className={cn(
                      'px-3 py-1.5 rounded-md font-medium transition-colors',
                      goal === g ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Calorie method</Label>
              <div className="inline-flex w-fit rounded-lg bg-muted p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setMethod('formula')}
                  className={cn(
                    'px-3 py-1.5 rounded-md font-medium transition-colors',
                    method === 'formula' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  TDEE formula
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('kcal-per-kg')}
                  className={cn(
                    'px-3 py-1.5 rounded-md font-medium transition-colors',
                    method === 'kcal-per-kg' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  kcal/kg bodyweight
                </button>
              </div>
              {method === 'kcal-per-kg' && (
                <Input
                  placeholder="kcal per kg bodyweight"
                  className="w-56 mt-1"
                  value={kcalPerKg}
                  onChange={(e) => setKcalPerKg(e.target.value)}
                />
              )}
              {goal === 'Manual' && (
                <Input
                  placeholder="Manual calorie target"
                  className="w-56 mt-1"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                />
              )}
            </div>

            <div className="rounded-lg border border-border-soft bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide">APPLIED CALORIE TARGET</p>
              <p className="text-2xl font-bold text-foreground mt-1">{appliedTarget != null ? `${appliedTarget} kcal` : '—'}</p>
            </div>

            <button
              disabled={saving}
              onClick={() => void handleSave()}
              className="h-10 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save meal plan'}
            </button>
          </CardContent>
        )}
      </Card>

      <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">CATEGORY KEY</span>
        {categoryKey.map((c) => (
          <span key={c.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
            {c.label}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {days.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveDayId(d.id)}
            className={cn(
              'group flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-md text-sm font-medium transition-colors',
              d.id === activeDay.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', d.id === activeDay.id ? 'bg-primary' : 'bg-border')} />
            {d.label}
            {days.length > 1 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  removeDay(d.id);
                }}
                className="p-0.5 rounded-full text-muted-foreground hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={11} />
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={addDay}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
        >
          <Plus size={14} />
        </button>
      </div>

      <Card>
        <CardContent className="pt-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-primary shrink-0" />
            <Input
              value={activeDay.label}
              onChange={(e) => renameDay(activeDay.id, e.target.value)}
              className="w-40"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {dayTargets.map((t) => {
              const value =
                t.key === 'cal'
                  ? Math.round(dayTotals.calories)
                  : t.key === 'protein'
                    ? Math.round(dayTotals.protein_g)
                    : t.key === 'carbs'
                      ? Math.round(dayTotals.carbs_g)
                      : t.key === 'fat'
                        ? Math.round(dayTotals.fat_g)
                        : null;
              const target = t.key === 'cal' && appliedTarget != null ? appliedTarget : null;
              return (
                <div key={t.key} className="flex flex-col gap-1.5">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</Label>
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{value ?? '—'}</span> /{' '}
                    <span className="text-muted-foreground">{target ?? '—'}</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            {activeDay.meals.map((meal) => {
              const totals = computeTotals(meal.rows, byId);
              return (
                <div key={meal.id} className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-background border-b border-border">
                    <Input
                      value={meal.name}
                      onChange={(e) => renameMeal(activeDay.id, meal.id, e.target.value)}
                      className="h-7 w-32 text-xs font-semibold"
                    />
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{Math.round(totals.calories)} cal</span>
                      <span>{Math.round(totals.protein_g)}gP</span>
                      <span>{Math.round(totals.carbs_g)}gC</span>
                      <span>{Math.round(totals.fat_g)}gF</span>
                      {activeDay.meals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMeal(activeDay.id, meal.id)}
                          className="text-muted-foreground hover:text-danger"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_60px_repeat(6,60px)_24px] gap-2 px-3 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span />
                    <span className="text-center">Qty</span>
                    {['Cal', 'Protein', 'Carbs', 'Fat', 'Fiber', 'Sodium'].map((m) => (
                      <span key={m} className="text-center">{m}</span>
                    ))}
                    <span />
                  </div>
                  <div className="divide-y divide-border">
                    {meal.rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-3 py-3">No foods added to this meal yet.</p>
                    ) : (
                      meal.rows.map((row) => (
                        <FoodRowInput
                          key={row.rowId}
                          row={row}
                          foods={foods}
                          onChange={(next) => updateMealRow(activeDay.id, meal.id, row.rowId, next)}
                          onRemove={() => removeMealRow(activeDay.id, meal.id, row.rowId)}
                        />
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => addMealRow(activeDay.id, meal.id)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Plus size={12} /> Add food
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => addMeal(activeDay.id)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-fit"
            >
              <Plus size={12} /> Add meal
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MealPlansPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const { clients } = useClients(profile.id);
  const { mealPlans, isLoading, error, createMealPlan, deleteMealPlan } = useMealPlans(profile.id);
  const [mode, setMode] = useState<'list' | 'builder'>('list');

  const handleSave: typeof createMealPlan = async (input) => {
    const result = await createMealPlan(input);
    if (!result.error) toast('Meal plan saved.');
    return result;
  };

  if (mode === 'builder') {
    return (
      <div className="p-6">
        <MealPlanBuilder clients={clients} onClose={() => setMode('list')} onSave={handleSave} />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Meal plans</h1>
          <p className="text-sm text-muted-foreground">Build reusable meal plans and assign them to clients.</p>
        </div>
        <button
          type="button"
          onClick={() => setMode('builder')}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New meal plan
        </button>
      </div>

      {error && <p className="text-sm text-danger">Could not load meal plans: {error}</p>}

      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground">Loading...</div>
      ) : mealPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center rounded-xl border border-border bg-card">
          <UtensilsCrossed size={32} className="text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">No meal plans yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Create a plan with training and non-training days, then assign it to your clients.
          </p>
          <button
            type="button"
            onClick={() => setMode('builder')}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity mt-1"
          >
            <Plus size={14} /> New meal plan
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {mealPlans.map((p) => {
            const client = clients.find((c) => c.id === p.client_id);
            const target = (p.data as { appliedTarget?: number }).appliedTarget;
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {client ? `${client.first_name} ${client.last_name}` : 'No client assigned'}
                    {target != null && ` · ${target} kcal target`}
                  </p>
                </div>
                <button
                  onClick={() => void deleteMealPlan(p.id)}
                  className="text-muted-foreground hover:text-danger p-1.5 rounded-md hover:bg-background"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
