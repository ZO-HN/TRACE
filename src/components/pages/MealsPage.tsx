import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/shadcn/card';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';
import { useProfile } from '@/components/layout/AppShell';
import { useClients } from '@/hooks/useClients';
import { useFoods } from '@/hooks/useFoods';
import { useMeals } from '@/hooks/useMeals';
import { useToast } from '@/components/ui/toast';

export default function MealsPage() {
  const profile = useProfile();
  const { toast } = useToast();
  const { clients } = useClients(profile.id);
  const { foods } = useFoods(profile.id);
  const { createMeal } = useMeals(profile.id);

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
      <h1 className="text-xl font-bold text-foreground">Create New Meal</h1>

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
