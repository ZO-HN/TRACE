import { useState } from 'react';
import { Apple, ChefHat, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Label, Input, Textarea } from '@/components/ui/shadcn/field';

function NewFoodDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');
  const [hasRecipe, setHasRecipe] = useState(false);

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
            <Input placeholder="e.g. 100g" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Calories</Label>
            <Input type="number" placeholder="0" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Protein (g)</Label>
            <Input type="number" placeholder="0" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Carbs (g)</Label>
            <Input type="number" placeholder="0" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fat (g)</Label>
            <Input type="number" placeholder="0" />
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
            <Textarea placeholder="Ingredients and preparation steps" />
          </div>
        )}

        <button
          type="button"
          disabled={!name.trim()}
          className="h-11 rounded-lg bg-success text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Save Food
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default function FoodsPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Foods</h1>
          <p className="text-sm text-muted-foreground">
            Your food library — any food can optionally include a recipe.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Food
        </button>
      </div>

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

      <NewFoodDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
