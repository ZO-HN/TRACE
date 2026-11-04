import { describe, expect, it } from 'vitest';
import {
  emptyDraft,
  moveDraftItem,
  privateSavePayload,
  toItemInserts,
  toTemplateInsert,
  validateDraft,
  type TemplateDraft,
} from '../../src/lib/templates/builder';

const validDraft = (): TemplateDraft => ({
  name: 'Lower Body A',
  description: '  ',
  scope: 'PUBLIC',
  assignedTraineeId: null,
  items: [
    { exerciseId: 'ex-1', sets: '3', reps: '8', rpe: '7', restSeconds: '120' },
    { exerciseId: 'ex-2', sets: '3', reps: '10', rpe: '', restSeconds: '90' },
  ],
});

describe('validateDraft', () => {
  it('accepts a well-formed draft', () => {
    expect(validateDraft(validDraft())).toEqual({ ok: true });
  });

  it('requires a name and at least one exercise', () => {
    expect(validateDraft({ ...validDraft(), name: '' }).ok).toBe(false);
    expect(validateDraft({ ...validDraft(), items: [] }).ok).toBe(false);
  });

  it('requires a trainee when scope is ASSIGNED', () => {
    const d = { ...validDraft(), scope: 'ASSIGNED' as const, assignedTraineeId: null };
    expect(validateDraft(d).ok).toBe(false);
  });

  it('enforces the numeric ranges from the DB CHECK constraints', () => {
    const overReps = validDraft();
    overReps.items[0].reps = '200';
    expect(validateDraft(overReps).ok).toBe(false);

    const badRpe = validDraft();
    badRpe.items[0].rpe = '11';
    expect(validateDraft(badRpe).ok).toBe(false);

    const badSets = validDraft();
    badSets.items[0].sets = '0';
    expect(validateDraft(badSets).ok).toBe(false);
  });

  it('allows empty RPE (optional)', () => {
    const d = validDraft();
    d.items[0].rpe = '';
    expect(validateDraft(d).ok).toBe(true);
  });
});

describe('toTemplateInsert', () => {
  it('trims, nulls empty description, and drops assignee for non-ASSIGNED scope', () => {
    const insert = toTemplateInsert(validDraft(), 'coach-1');
    expect(insert).toEqual({
      creator_id: 'coach-1',
      name: 'Lower Body A',
      description: null,
      scope: 'PUBLIC',
      assigned_trainee_id: null,
      is_active: true,
    });
  });

  it('keeps the assignee only when scope is ASSIGNED', () => {
    const d = { ...validDraft(), scope: 'ASSIGNED' as const, assignedTraineeId: 't-9' };
    expect(toTemplateInsert(d, 'coach-1').assigned_trainee_id).toBe('t-9');
  });
});

describe('toItemInserts', () => {
  it('assigns 1-based positions and converts numerics, nulling empty RPE', () => {
    const items = toItemInserts(validDraft(), 'tmpl-1');
    expect(items[0]).toEqual({
      template_id: 'tmpl-1',
      exercise_id: 'ex-1',
      position: 1,
      target_sets: 3,
      target_reps: 8,
      target_rpe: 7,
      rest_seconds: 120,
    });
    expect(items[1].position).toBe(2);
    expect(items[1].target_rpe).toBeNull();
  });
});

describe('emptyDraft', () => {
  it('starts PRIVATE with one blank item', () => {
    const d = emptyDraft();
    expect(d.scope).toBe('PRIVATE');
    expect(d.items).toHaveLength(1);
  });
});

describe('private authoring', () => {
  it('moves the complete prescription and derives contiguous positions without mutating input', () => {
    const draft = validDraft();
    const reordered = moveDraftItem(draft, 1, -1);
    expect(reordered.items[0]).toEqual(draft.items[1]);
    expect(draft.items[0].exerciseId).toBe('ex-1');
    expect(toItemInserts(reordered, 'template').map((item) => [item.exercise_id, item.position])).toEqual([['ex-2', 1], ['ex-1', 2]]);
    expect(moveDraftItem(draft, 0, -1)).toBe(draft);
  });
  it('sends private existing fields, stable IDs, repeated exercises and zero rest', () => {
    const draft = { ...validDraft(), scope: 'PRIVATE' as const };
    draft.items[1].exerciseId = draft.items[0].exerciseId;
    draft.items[1].restSeconds = '0';
    const payload = privateSavePayload(draft, 'coach', 'operation', 'template');
    expect(payload).toMatchObject({ p_creator_id: 'coach', p_operation_id: 'operation', p_template_id: 'template', p_description: null });
    expect(payload.p_items[1]).toEqual({ exercise_id: 'ex-1', position: 2, target_sets: 3, target_reps: 10, target_rpe: null, rest_seconds: 0 });
    expect(payload.p_items[0]).not.toHaveProperty('template_id');
  });
  it('rejects publication, assignment and invalid numeric values before saving', () => {
    expect(() => privateSavePayload(validDraft(), 'c', 'o', 't')).toThrow('Only private');
    const draft = { ...validDraft(), scope: 'PRIVATE' as const, assignedTraineeId: 'someone' };
    expect(() => privateSavePayload(draft, 'c', 'o', 't')).toThrow('Only private');
    for (const reps of ['NaN', 'Infinity', '2.5', '-1', '']) {
      const bad = { ...validDraft(), scope: 'PRIVATE' as const };
      bad.items[0].reps = reps;
      expect(() => privateSavePayload(bad, 'c', 'o', 't')).toThrow();
    }
  });
});
