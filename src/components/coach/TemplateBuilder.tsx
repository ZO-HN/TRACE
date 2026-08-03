// Coach template builder: author a workout_templates row + its ordered
// template_items. Uses the pure draft model in lib/templates/builder.ts.

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardList, Plus, Trash2, X } from 'lucide-react';
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
import Button from '../ui/Button';
import Card from '../ui/Card';

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
      <motion.button
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(true)}
        className="w-full bg-surface border border-dashed border-border hover:border-primary text-gray-300 font-medium py-3 px-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        New Program Template
      </motion.button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-white">New Template</h3>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300">
              <X size={16} />
            </button>
          </div>

          <input
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Template name"
            className="w-full h-10 bg-background border border-border rounded-xl px-3 text-sm text-gray-100 focus:border-primary outline-none"
          />

          <select
            value={draft.scope}
            onChange={(e) => update({ scope: e.target.value as TemplateScope })}
            className="w-full h-10 bg-background border border-border rounded-xl px-3 text-sm text-gray-100 focus:border-primary outline-none"
          >
            <option value="PRIVATE">Private (draft)</option>
            <option value="PUBLIC">Public (any trainee)</option>
            <option value="ASSIGNED">Assigned to a trainee</option>
          </select>

          <div className="space-y-2">
            {draft.items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-background border border-border rounded-xl p-2 space-y-2"
              >
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
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
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
              </motion.div>
            ))}
            <button
              onClick={addItem}
              className="text-xs font-medium text-primary hover:opacity-80 flex items-center gap-1"
            >
              <Plus size={13} />
              Add exercise
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button onClick={() => void handleSave()} disabled={!valid} loading={status === 'saving'} fullWidth>
            Save Template
          </Button>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
