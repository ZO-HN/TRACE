// In-memory, client-side workout library shared between the Workouts tab
// (where coaches create workouts) and the Calendar tab (where they get
// assigned to a date). There is no `workouts` table in Supabase yet — this
// keeps both views in sync without one until that table exists.

import { useSyncExternalStore } from 'react';

export const WORKOUT_CATEGORIES = ['Full Body', 'Upper', 'Lower', 'Push', 'Pull', 'Legs'] as const;
export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number];

export interface WorkoutOption {
  id: string;
  name: string;
  category: WorkoutCategory;
  author: string;
  createdAt: string;
}

let workouts: WorkoutOption[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function addWorkout(input: { name: string; category: WorkoutCategory; author?: string }) {
  const workout: WorkoutOption = {
    id: `w-${workouts.length + 1}-${input.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: input.name,
    category: input.category,
    author: input.author ?? 'Coach',
    createdAt: new Date().toISOString(),
  };
  workouts = [...workouts, workout];
  emit();
  return workout;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return workouts;
}

export function useWorkoutLibrary() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
