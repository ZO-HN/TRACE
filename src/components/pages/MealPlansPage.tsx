import { useState } from 'react';
import { ChevronDown, ChevronUp, Flame, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Label, Input, Select } from '@/components/ui/shadcn/field';

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

function MealPlanBuilder({ onClose }: { onClose: () => void }) {
  const [tdeeOpen, setTdeeOpen] = useState(true);
  const [goal, setGoal] = useState<'Maintain' | 'Cut' | 'Surplus' | 'Manual'>('Maintain');
  const [method, setMethod] = useState<'formula' | 'kcal-per-kg'>('formula');
  const [rows, setRows] = useState(5);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Building for
          <Select className="w-48 h-8" defaultValue="">
            <option value="" disabled>
              No client selected
            </option>
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
            <div className="flex flex-col gap-1.5">
              <Label>Client</Label>
              <Select defaultValue="">
                <option value="" disabled>
                  Select a client to prefill
                </option>
              </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Sex</Label>
                <Select defaultValue="unspecified">
                  <option value="unspecified">Unspecified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Age (yrs)</Label>
                <Input placeholder="—" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Height (cm)</Label>
                <Input placeholder="—" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Weight</Label>
                <Input placeholder="—" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Avg. daily steps</Label>
                <Input placeholder="—" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Training sessions/wk</Label>
                <Input placeholder="—" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Cardio sessions/wk</Label>
                <Input placeholder="—" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground -mt-2">
              Fields prefill from tracked data — or the client's onboarding answers when tracked data isn't available. Every field is editable.
            </p>

            <div className="rounded-lg border border-border-soft bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide">MAINTENANCE ESTIMATE (FORMULA)</p>
              <p className="text-2xl font-bold text-foreground mt-1">—</p>
              <p className="text-xs text-muted-foreground mt-1">
                Enter age, height, and weight to estimate — or set calories manually below.
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
            </div>

            <div className="rounded-lg border border-border-soft bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide">APPLIED CALORIE TARGET</p>
              <p className="text-2xl font-bold text-foreground mt-1">—</p>
            </div>

            <button className="h-10 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Apply to this day
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

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-muted text-sm font-medium text-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" /> Daily
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground">
          <Plus size={14} />
        </button>
      </div>

      <Card>
        <CardContent className="pt-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-primary shrink-0" />
            <Input defaultValue="Daily" className="w-40" />
            <Input defaultValue="custom" className="w-32" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {dayTargets.map((t) => (
              <div key={t.key} className="flex flex-col gap-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</Label>
                <p className="text-sm text-foreground">
                  <span className="font-semibold">0</span> / <span className="text-muted-foreground">—</span>
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Pre-workout meal</Label>
              <Select className="w-32 h-8" defaultValue="none">
                <option value="none">None</option>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" className="accent-primary" /> Insert intra-workout meal
            </label>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-background border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Meal 1</span>
                <Select className="h-7 w-28 text-xs" defaultValue="none">
                  <option value="none">No timing</option>
                </Select>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>0</span>
                <span>0gP</span>
                <span>0gC</span>
                <span>0gF</span>
                <button className="text-muted-foreground hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_repeat(6,60px)_24px] items-center gap-2 px-3 py-1.5 text-xs">
                  <Input placeholder="Search foods..." className="h-8 text-xs" />
                  {['Cal', 'Protein', 'Carbs', 'Fat', 'Fiber', 'Sodium'].map((m) => (
                    <span key={m} className="text-center text-muted-foreground">—</span>
                  ))}
                  <button className="text-muted-foreground hover:text-danger">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 px-3 py-2 border-t border-border">
              <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Plus size={12} /> Add food
              </button>
              <button
                onClick={() => setRows((r) => r + 1)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus size={12} /> Add row
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MealPlansPage() {
  const [mode, setMode] = useState<'list' | 'builder'>('list');

  if (mode === 'builder') {
    return (
      <div className="p-6">
        <MealPlanBuilder onClose={() => setMode('list')} />
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
    </div>
  );
}
