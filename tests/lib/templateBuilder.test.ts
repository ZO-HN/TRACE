import { describe, expect, it } from 'vitest';
import {
  emptyDraft,
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
