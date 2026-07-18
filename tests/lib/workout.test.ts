import { describe, expect, it } from 'vitest';
import {
  createSessionDraft,
  sessionInsertFrom,
} from '../../src/lib/workout/session';
import { indexByName, lookupExerciseId } from '../../src/lib/workout/catalog';

describe('session builders', () => {
  it('computes duration from draft start to now, rounded to seconds', () => {
    const draft = createSessionDraft('user-1', 'Push Day', 1_000_000, 'sess-1');
    const insert = sessionInsertFrom(draft, 1_000_000 + 125_400);
    expect(insert).toEqual({
      id: 'sess-1',
      user_id: 'user-1',
      template_id: null,
      session_name: 'Push Day',
      completed_at: new Date(1_125_400).toISOString(),
      duration_seconds: 125,
    });
  });

  it('carries the template id when the workout came from a template', () => {
    const draft = createSessionDraft('user-1', 'Push Day', 1_000_000, 'sess-1');
    expect(sessionInsertFrom(draft, 2_000_000, 'tmpl-9').template_id).toBe('tmpl-9');
  });

  it('clamps negative durations to zero (clock skew)', () => {
    const draft = createSessionDraft('user-1', 'X', 2_000_000, 'sess-1');
    expect(sessionInsertFrom(draft, 1_000_000).duration_seconds).toBe(0);
  });
});

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
