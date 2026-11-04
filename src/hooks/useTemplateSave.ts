import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { privateSavePayload, type TemplateDraft } from '../lib/templates/builder';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useTemplateSave() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const ids = useRef<{ owner: string; operation: string; template: string } | null>(null);
  const pending = useRef<Promise<string | null> | null>(null);
  const lifecycle = useRef({ active: false });
  useEffect(() => {
    const lease = { active: true };
    lifecycle.current = lease;
    return () => { lease.active = false; };
  }, []);

  const save = (draft: TemplateDraft, creatorId: string): Promise<string | null> => {
    const lease = lifecycle.current;
    if (!lease.active) return Promise.resolve(null);
    if (pending.current) return ids.current?.owner === creatorId ? pending.current : Promise.resolve(null);
    const current = () => lease.active;
    const operation = (async () => {
      try {
        // IDs survive errors, including an unknown outcome after response loss.
        if (ids.current && ids.current.owner !== creatorId) throw new Error('Account changed. Reopen the workout builder.');
        ids.current ??= { owner: creatorId, operation: crypto.randomUUID(), template: crypto.randomUUID() };
        const payload = privateSavePayload(draft, creatorId, ids.current.operation, ids.current.template);
        if (current()) { setStatus('saving'); setError(null); }
        const { data, error: saveError } = await supabase.rpc('save_workout_template', payload);
        if (saveError) throw new Error(saveError.message);
        if (data !== ids.current.template) throw new Error('Save outcome is unknown. Retry with the same workout.');
        if (!current()) return null;
        setStatus('saved');
        return data as string;
      } catch (cause) {
        if (current()) {
          setError(cause instanceof Error ? cause.message : 'Could not save workout. Retry with the same workout.');
          setStatus('error');
        }
        return null;
      }
    })();
    pending.current = operation;
    void operation.finally(() => { if (pending.current === operation) pending.current = null; });
    return operation;
  };

  const reset = () => {
    // Only a confirmed save starts a new operation. Closing after failure retains IDs.
    if (pending.current || status !== 'saved') return;
    ids.current = null;
    setStatus('idle');
    setError(null);
  };
  return { save, status, error, reset };
}
