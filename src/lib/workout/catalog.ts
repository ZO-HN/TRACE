// Exercise catalog helpers: map DB exercise rows to a name -> id lookup so the
// logger can resolve real foreign keys for set_logs.

export interface ExerciseRow {
  id: string;
  name: string;
}

/** Case-insensitive name -> id index. Later duplicates do not overwrite earlier ones. */
export function indexByName(rows: ExerciseRow[]): Record<string, string> {
  const index: Record<string, string> = {};
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    if (key && !(key in index)) index[key] = row.id;
  }
  return index;
}

export function lookupExerciseId(
  index: Record<string, string>,
  name: string,
): string | undefined {
  return index[name.trim().toLowerCase()];
}
