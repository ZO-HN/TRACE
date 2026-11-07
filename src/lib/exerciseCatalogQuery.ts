export const EXERCISE_PAGE_SIZE = 50;

// Escape Postgres LIKE metacharacters so search text stays literal.
export function escapeExerciseSearch(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
