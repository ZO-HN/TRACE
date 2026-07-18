import { describe, expect, it } from 'vitest';
import {
  templateToExercises,
  type TemplateItemRow,
} from '../../src/lib/workout/template';

const row = (over: Partial<TemplateItemRow>): TemplateItemRow => ({
  position: 1,
  target_sets: 3,
  target_reps: 8,
  target_rpe: 7,
  exercise: { id: 'ex-1', name: 'Barbell Back Squat' },
  ...over,
});

describe('templateToExercises', () => {
  it('orders by position and expands target_sets into set rows', () => {
    const result = templateToExercises([
      row({ position: 2, exercise: { id: 'ex-2', name: 'RDL' }, target_sets: 2 }),
      row({ position: 1 }),
    ]);
    expect(result.map((e) => e.name)).toEqual(['Barbell Back Squat', 'RDL']);
    expect(result[0].sets).toHaveLength(3);
    expect(result[1].sets).toHaveLength(2);
  });

  it('prefills reps/rpe targets, leaves weight empty and sets uncompleted', () => {
    const [exercise] = templateToExercises([row({})]);
    expect(exercise.sets[0]).toEqual({
      id: 'ex-1-s1',
      weight: '',
      reps: '8',
      rpe: '7',
      completed: false,
    });
  });

  it('renders null rpe as empty string and guarantees at least one set', () => {
    const [exercise] = templateToExercises([row({ target_rpe: null, target_sets: 0 })]);
    expect(exercise.sets).toHaveLength(1);
    expect(exercise.sets[0].rpe).toBe('');
  });

  it('uses the real exercise UUID as the logger exercise id (set_logs FK)', () => {
    const [exercise] = templateToExercises([row({})]);
    expect(exercise.id).toBe('ex-1');
  });
});
