// Coach template builder: author a workout_templates row + its ordered
// template_items. Uses the pure draft model in lib/templates/builder.ts.

import { useState } from 'react';
import { useExerciseCatalog } from '../../hooks/useExerciseCatalog';
import { useTemplateSave } from '../../hooks/useTemplateSave';
import {
  emptyDraft,
  emptyDraftItem,
  validateDraft,
  type DraftItem,
  type TemplateDraft,
  type TemplateScope,
} from '../../lib/templates/builder';

const NUM_FIELD =
  'w-16 h-9 bg-background border border-border rounded-lg text-center text-sm text-gray-100 focus:border-primary outline-none';

export default function TemplateBuilder({ coachId }: { coachId: string }) {
  const { rows: exercises } = useExerciseCatalog();
  const { save, status, error } = useTemplateSave();
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft);
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<TemplateDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  const addItem = () => setDraft((d) => ({ ...d, items: [...d.items, emptyDraftItem()] }));
  const removeItem = (index: number) =>
    setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== index) }));

  const handleSave = async () => {
    const id = await save(draft, coachId);
    if (id) {
      setDraft(emptyDraft());
      setOpen(false);
    }
  };

  const valid = validateDraft(draft).ok;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-surface border border-dashed border-border hover:border-primary text-gray-300 font-medium py-3 px-4 rounded-xl transition-colors"
      >
        + New Program Template
      </button>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">New Template</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-300">
          Cancel
        </button>
      </div>

      <input
        value={draft.name}
        onChange={(e) => update({ name: e.target.value })}
        placeholder="Template name"
        className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm text-gray-100 focus:border-primary outline-none"
      />

      <select
        value={draft.scope}
        onChange={(e) => update({ scope: e.target.value as TemplateScope })}
        className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm text-gray-100 focus:border-primary outline-none"
      >
        <option value="PRIVATE">Private (draft)</option>
        <option value="PUBLIC">Public (any trainee)</option>
        <option value="ASSIGNED">Assigned to a trainee</option>
      </select>

      <div className="space-y-2">
        {draft.items.map((item, i) => (
          <div key={i} className="bg-background border border-border rounded-lg p-2 space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={item.exerciseId}
                onChange={(e) => updateItem(i, { exerciseId: e.target.value })}
                className="flex-1 h-9 bg-surface border border-border rounded-lg px-2 text-sm text-gray-100 focus:border-primary outline-none"
              >
                <option value="">Select exercise...</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              {draft.items.length > 1 && (
                <button
                  onClick={() => removeItem(i)}
                  className="text-xs text-red-400 hover:text-red-300 px-2"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <label className="flex flex-col gap-1">
                Sets
                <input className={NUM_FIELD} value={item.sets} onChange={(e) => updateItem(i, { sets: e.target.value })} inputMode="numeric" />
              </label>
              <label className="flex flex-col gap-1">
                Reps
                <input className={NUM_FIELD} value={item.reps} onChange={(e) => updateItem(i, { reps: e.target.value })} inputMode="numeric" />
              </label>
              <label className="flex flex-col gap-1">
                RPE
                <input className={NUM_FIELD} value={item.rpe} onChange={(e) => updateItem(i, { rpe: e.target.value })} inputMode="numeric" placeholder="-" />
              </label>
              <label className="flex flex-col gap-1">
                Rest s
                <input className={NUM_FIELD} value={item.restSeconds} onChange={(e) => updateItem(i, { restSeconds: e.target.value })} inputMode="numeric" />
              </label>
            </div>
          </div>
        ))}
        <button onClick={addItem} className="text-xs font-medium text-primary hover:opacity-80">
          + Add exercise
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={() => void handleSave()}
        disabled={!valid || status === 'saving'}
        className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
      >
        {status === 'saving' ? 'Saving...' : 'Save Template'}
      </button>
    </div>
  );
}
