import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/shadcn/card';
import { Label, Input, Textarea, Select } from '@/components/ui/shadcn/field';

export default function MealsPage() {
  const [foods, setFoods] = useState<string[]>([]);

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
            <Select defaultValue="">
              <option value="" disabled>
                Select a client...
              </option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select defaultValue="">
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
              <Input type="datetime-local" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Label</Label>
            <Input placeholder="Auto-generated from foods if left blank" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Foods</CardTitle>
          <button
            type="button"
            onClick={() => setFoods((f) => [...f, `Food ${f.length + 1}`])}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-surface transition-colors"
          >
            <Plus size={12} /> Add Food
          </button>
        </CardHeader>
        <CardContent className="pt-0">
          {foods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No foods added yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {foods.map((f, i) => (
                <li key={i} className="text-sm text-foreground bg-background border border-border rounded-lg px-3 py-2">
                  {f}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <button className="h-11 px-6 rounded-lg bg-success text-white font-semibold hover:opacity-90 transition-opacity">
          Create Meal
        </button>
        <button className="h-11 px-6 rounded-lg border border-border text-foreground font-semibold hover:bg-surface transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
