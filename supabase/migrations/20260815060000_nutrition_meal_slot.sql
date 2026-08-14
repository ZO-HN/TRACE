-- Real meal-slot assignment for nutrition_logs, replacing the client-side
-- chronological-order approximation documented in
-- src/lib/nutrition/mealSlots.ts. Nullable and additive — existing rows
-- (and any insert path that doesn't pass a slot) keep working exactly as
-- before; groupIntoMealSlots falls back to chronological placement for
-- rows where meal_slot is null.
--
-- No upper bound on the check — "Add Meal" lets a trainee add slots past
-- the default 6, so a hardcoded <= 6 would reject those.

alter table public.nutrition_logs
  add column if not exists meal_slot smallint check (meal_slot > 0);
