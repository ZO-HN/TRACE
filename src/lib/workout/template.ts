// Maps template_items rows (with joined exercise) into the logger's local
// exercise/set structure. Pure and framework-free.

export interface TemplateItemRow {
  position: number;
  target_sets: number;
  target_reps: number;
  target_rpe: number | null;
  exercise: { id: string; name: string };
}

export interface LoggerSet {
  id: string;
  weight: string;
  reps: string;
  rpe: string;
  completed: boolean;
}

export interface LoggerExercise {
  id: string; // real exercises.id UUID — used directly as the set_logs FK
  name: string;
  sets: LoggerSet[];
}

/** Build logger state from template items, ordered by position. */
export function templateToExercises(rows: TemplateItemRow[]): LoggerExercise[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      id: row.exercise.id,
      name: row.exercise.name,
      sets: Array.from({ length: Math.max(1, row.target_sets) }, (_, i) => ({
        id: `${row.exercise.id}-s${i + 1}`,
        weight: '',
        reps: String(row.target_reps),
        rpe: row.target_rpe == null ? '' : String(row.target_rpe),
        completed: false,
      })),
    }));
}
