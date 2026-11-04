import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from 'lucide-react';
import { useTemplateSave } from '../../hooks/useTemplateSave';
import { supabase } from '../../lib/supabase';
import { emptyDraft, emptyDraftItem, moveDraftItem, validateDraft, type DraftItem } from '../../lib/templates/builder';

export default function TemplateBuilder({ coachId, onSaved }: { coachId: string; onSaved: (id: string) => void }) {
  const { save, status, error, reset } = useTemplateSave();
  const [draft, setDraft] = useState(emptyDraft);
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<{ id: string; name: string }[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const saving = status === 'saving';
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCatalogLoading(true); setCatalogError(null); setCatalog([]);
    void (async () => {
      try {
        const { data, error } = await supabase.from('exercises').select('id, name').order('name');
        if (error) throw new Error(error.message);
        if (!cancelled) setCatalog(data ?? []);
      } catch (cause) {
        if (!cancelled) setCatalogError(cause instanceof Error ? cause.message : 'Could not load exercises.');
      } finally { if (!cancelled) setCatalogLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, catalogAttempt, coachId]);
  const updateItem = (index: number, patch: Partial<DraftItem>) => setDraft((value) => ({
    ...value, items: value.items.map((item, i) => i === index ? { ...item, ...patch } : item),
  }));
  const handleSave = async () => {
    const id = await save(draft, coachId);
    if (id) { setDraft(emptyDraft()); setQuery(''); setOpen(false); onSaved(id); }
  };

  return <>
    <button type="button" onClick={() => { reset(); setOpen(true); }} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold">
      <Plus size={14} /> {status === 'error' ? 'Resume workout draft' : 'Create workout'}
    </button>
    {open && <div role="dialog" aria-modal="true" aria-labelledby="workout-builder-title" className="fixed inset-0 z-40 bg-background overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="workout-builder-title" className="text-lg font-semibold">New private workout</h2>
          <button type="button" aria-label="Close workout builder" disabled={saving} onClick={() => setOpen(false)} className="p-2"><X size={20} /></button>
        </div>
        <p className="text-sm text-muted-foreground">Save a private workout to your library. Assignment is unavailable while delivery behavior is being finalized.</p>
        <fieldset disabled={saving} className="space-y-4">
          <label className="block text-sm">Workout name
            <input value={draft.name} maxLength={150} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="block w-full h-10 rounded-lg border border-border bg-surface px-3" />
          </label>
          <label className="block text-sm">Description (optional)
            <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="block w-full rounded-lg border border-border bg-surface p-3" />
          </label>
          {catalogLoading && <p role="status">Loading exercises…</p>}
          {catalogError && <div role="alert">{catalogError} <button type="button" onClick={() => setCatalogAttempt((n) => n + 1)}>Retry exercises</button></div>}
          {!catalogLoading && !catalogError && catalog.length === 0 && <p>No exercises available. Add an exercise to the catalog before creating a workout.</p>}
          <label className="block text-sm">Search exercises
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="block w-full h-10 rounded-lg border border-border bg-surface px-3" />
          </label>
          <ol className="space-y-3">
            {draft.items.map((item, index) => <li key={index} className="rounded-xl border border-border bg-card p-3 space-y-3">
              <div className="flex items-center gap-2">
                <label className="flex-1 text-sm">Exercise {index + 1}
                  <select aria-label={`Exercise ${index + 1}`} value={item.exerciseId} onChange={(event) => updateItem(index, { exerciseId: event.target.value })} className="block w-full h-10 rounded-lg border border-border bg-surface px-2">
                    <option value="">Select exercise</option>
                    {catalog.filter((exercise) => exercise.id === item.exerciseId || exercise.name.toLowerCase().includes(query.toLowerCase())).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
                  </select>
                </label>
                <button type="button" aria-label={`Move exercise ${index + 1} up`} disabled={index === 0} onClick={() => setDraft(moveDraftItem(draft, index, -1))}><ArrowUp size={18} /></button>
                <button type="button" aria-label={`Move exercise ${index + 1} down`} disabled={index === draft.items.length - 1} onClick={() => setDraft(moveDraftItem(draft, index, 1))}><ArrowDown size={18} /></button>
                <button type="button" aria-label={`Remove exercise ${index + 1}`} onClick={() => setDraft({ ...draft, items: draft.items.filter((_, i) => i !== index) })}><Trash2 size={18} /></button>
              </div>
              <div className="flex flex-wrap gap-3">
                {([
                  ['sets', 'Sets', 1, 20], ['reps', 'Reps', 1, 100],
                  ['rpe', 'RPE (optional)', 1, 10], ['restSeconds', 'Rest seconds', 0, 600],
                ] as const).map(([field, label, min, max]) => <label key={field} className="text-sm">{label}
                  <input aria-label={`${label} exercise ${index + 1}`} type="number" min={min} max={max} step="1" value={item[field]} onChange={(event) => updateItem(index, { [field]: event.target.value })} className="block w-28 h-10 rounded-lg border border-border bg-surface px-2" />
                </label>)}
              </div>
            </li>)}
          </ol>
          <button type="button" onClick={() => setDraft({ ...draft, items: [...draft.items, emptyDraftItem()] })} className="flex items-center gap-2 text-sm text-primary"><Plus size={16} /> Add exercise</button>
        </fieldset>
        {error && <div role="alert" className="text-sm text-red-400">{error}<p>Your draft is retained. If the response was lost, retry unchanged to recover the original save. A changed request cannot overwrite it.</p></div>}
        <div className="flex gap-3">
          <button type="button" disabled={saving || !validateDraft(draft).ok || catalogLoading || Boolean(catalogError)} onClick={() => void handleSave()} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-success text-white disabled:opacity-50"><Save size={16} />{saving ? 'Saving…' : status === 'error' ? 'Retry save' : 'Save & Close'}</button>
          <button type="button" disabled={saving} onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg border border-border">Close and keep draft</button>
        </div>
      </div>
    </div>}
  </>;
}
