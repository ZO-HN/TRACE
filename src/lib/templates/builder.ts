// Pure draft model + validation + payload mapping for the coach template
// builder. Ranges mirror the DB CHECK constraints in template_items.

export type TemplateScope = 'PUBLIC' | 'PRIVATE' | 'ASSIGNED';

export interface DraftItem {
  exerciseId: string;
  sets: string; // raw input strings; validated/converted here
  reps: string;
  rpe: string; // '' = none
  restSeconds: string;
}

export interface TemplateDraft {
  name: string;
  description: string;
  scope: TemplateScope;
  assignedTraineeId: string | null;
  items: DraftItem[];
}

export const emptyDraftItem = (): DraftItem => ({
  exerciseId: '',
  sets: '3',
  reps: '8',
  rpe: '',
  restSeconds: '90',
});

export const emptyDraft = (): TemplateDraft => ({
  name: '',
  description: '',
  scope: 'PRIVATE',
  assignedTraineeId: null,
  items: [emptyDraftItem()],
});

export type DraftValidation = { ok: true } | { ok: false; reason: string };

const inRange = (raw: string, min: number, max: number): boolean => {
  const n = Number(raw);
  return raw.trim() !== '' && Number.isInteger(n) && n >= min && n <= max;
};

export function validateDraft(draft: TemplateDraft): DraftValidation {
  if (!draft.name.trim()) return { ok: false, reason: 'Template needs a name' };
  if (draft.name.length > 150) return { ok: false, reason: 'Name is too long (max 150)' };
  if (draft.scope === 'ASSIGNED' && !draft.assignedTraineeId) {
    return { ok: false, reason: 'Assigned templates need a trainee' };
  }
  if (draft.items.length === 0) return { ok: false, reason: 'Add at least one exercise' };

  for (const [i, item] of draft.items.entries()) {
    const label = `Item ${i + 1}`;
    if (!item.exerciseId) return { ok: false, reason: `${label}: pick an exercise` };
    if (!inRange(item.sets, 1, 20)) return { ok: false, reason: `${label}: sets must be 1-20` };
    if (!inRange(item.reps, 1, 100)) return { ok: false, reason: `${label}: reps must be 1-100` };
    if (item.rpe.trim() !== '' && !inRange(item.rpe, 1, 10)) {
      return { ok: false, reason: `${label}: RPE must be 1-10` };
    }
    if (!inRange(item.restSeconds, 0, 600)) {
      return { ok: false, reason: `${label}: rest must be 0-600s` };
    }
  }
  return { ok: true };
}

export interface TemplateInsert {
  creator_id: string;
  name: string;
  description: string | null;
  scope: TemplateScope;
  assigned_trainee_id: string | null;
  is_active: boolean;
}

export interface TemplateItemInsert {
  template_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: number;
  target_rpe: number | null;
  rest_seconds: number;
}

/** Assumes validateDraft(draft).ok — call it first. */
export function toTemplateInsert(draft: TemplateDraft, creatorId: string): TemplateInsert {
  return {
    creator_id: creatorId,
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    scope: draft.scope,
    assigned_trainee_id: draft.scope === 'ASSIGNED' ? draft.assignedTraineeId : null,
    is_active: true,
  };
}

export function toItemInserts(draft: TemplateDraft, templateId: string): TemplateItemInsert[] {
  return draft.items.map((item, i) => ({
    template_id: templateId,
    exercise_id: item.exerciseId,
    position: i + 1,
    target_sets: Number(item.sets),
    target_reps: Number(item.reps),
    target_rpe: item.rpe.trim() === '' ? null : Number(item.rpe),
    rest_seconds: Number(item.restSeconds),
  }));
}

/** Array order is the prescription order; repeated exercises remain separate items. */
export function moveDraftItem(draft: TemplateDraft, index: number, offset: -1 | 1): TemplateDraft {
  const target = index + offset;
  if (index < 0 || index >= draft.items.length || target < 0 || target >= draft.items.length) return draft;
  const items = [...draft.items];
  [items[index], items[target]] = [items[target], items[index]];
  return { ...draft, items };
}

export function privateSavePayload(draft: TemplateDraft, creatorId: string, operationId: string, templateId: string) {
  const check = validateDraft(draft);
  if (!check.ok) throw new Error(check.reason);
  if (draft.scope !== 'PRIVATE' || draft.assignedTraineeId !== null) {
    throw new Error('Only private workouts can be saved here. Assignment is not available yet.');
  }
  return {
    p_operation_id: operationId,
    p_template_id: templateId,
    p_creator_id: creatorId,
    p_name: draft.name.trim(),
    p_description: draft.description.trim() || null,
    p_items: toItemInserts(draft, templateId).map(({ template_id: _templateId, ...item }) => item),
  };
}
