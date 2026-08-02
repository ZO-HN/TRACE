import { describe, expect, it } from 'vitest';
import { indexByName, lookupExerciseId } from '../../src/lib/workout/catalog';

describe('exercise catalog index', () => {
  const rows = [
    { id: 'a', name: 'Barbell Back Squat' },
    { id: 'b', name: 'Romanian Deadlift' },
    { id: 'dup', name: 'barbell back squat' }, // duplicate name, different case
  ];

  it('indexes case-insensitively and keeps the first occurrence', () => {
    const index = indexByName(rows);
    expect(index['barbell back squat']).toBe('a');
    expect(Object.keys(index)).toHaveLength(2);
  });

  it('looks up ignoring case and whitespace', () => {
    const index = indexByName(rows);
    expect(lookupExerciseId(index, '  Romanian Deadlift ')).toBe('b');
    expect(lookupExerciseId(index, 'Unknown Movement')).toBeUndefined();
  });
});
