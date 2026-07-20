// Persists a coach template: insert the parent workout_templates row, then
// its template_items. RLS ensures only the creator can write.

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  toItemInserts,
  toTemplateInsert,
  validateDraft,
  type TemplateDraft,
} from '../lib/templates/builder';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseTemplateSave {
  save: (draft: TemplateDraft, creatorId: string) => Promise<string | null>;
  status: SaveStatus;
  error: string | null;
  reset: () => void;
}

export function useTemplateSave(): UseTemplateSave {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const save = async (draft: TemplateDraft, creatorId: string) => {
    const check = validateDraft(draft);
    if (!check.ok) {
      setError(check.reason);
      setStatus('error');
      return null;
    }

    setStatus('saving');
    setError(null);
    try {
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .insert(toTemplateInsert(draft, creatorId))
        .select('id')
        .single();
      if (templateError || !template) throw templateError ?? new Error('Insert failed');

      const items = toItemInserts(draft, template.id);
      const { error: itemsError } = await supabase
        .from('template_items')
        .insert(items);
      if (itemsError) throw itemsError;

      setStatus('saved');
      return template.id as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save template');
      setStatus('error');
      return null;
    }
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
  };

  return { save, status, error, reset };
}
