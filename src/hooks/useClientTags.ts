// Coach-authored client tags (Clients page → Tags dialog) + which clients
// each tag is assigned to. Assignment UI (an "add tag" control per client
// row) isn't built yet — assignmentsByClient will be empty until that
// follow-up ships; this hook is real, just nothing writes assignments yet.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ClientTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface UseClientTags {
  tags: ClientTag[];
  assignmentsByClient: Map<string, ClientTag[]>;
  isLoading: boolean;
  error: string | null;
  createTag: (name: string, color: string) => Promise<{ error: string | null }>;
  deleteTag: (id: string) => Promise<{ error: string | null }>;
}

export function useClientTags(coachId: string): UseClientTags {
  const [tags, setTags] = useState<ClientTag[]>([]);
  const [assignmentsByClient, setAssignmentsByClient] = useState<Map<string, ClientTag[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchAll = async () => {
    const [{ data: tagRows, error: tagError }, { data: assignRows, error: assignError }] = await Promise.all([
      supabase.from('client_tags').select('id, name, color, created_at').eq('coach_id', coachId).order('created_at'),
      supabase.from('client_tag_assignments').select('tag_id, client_id'),
    ]);
    if (!mountedRef.current) return;
    const queryError = tagError ?? assignError;
    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
      const tagList = (tagRows as ClientTag[]) ?? [];
      const byId = new Map(tagList.map((t) => [t.id, t]));
      const byClient = new Map<string, ClientTag[]>();
      for (const row of (assignRows as { tag_id: string; client_id: string }[]) ?? []) {
        const tag = byId.get(row.tag_id);
        if (!tag) continue;
        const existing = byClient.get(row.client_id) ?? [];
        existing.push(tag);
        byClient.set(row.client_id, existing);
      }
      setTags(tagList);
      setAssignmentsByClient(byClient);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchAll();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createTag: UseClientTags['createTag'] = async (name, color) => {
    const { error: insertError } = await supabase.from('client_tags').insert({ coach_id: coachId, name: name.trim(), color });
    if (!insertError) await fetchAll();
    return { error: insertError?.message ?? null };
  };

  const deleteTag: UseClientTags['deleteTag'] = async (id) => {
    const { error: deleteError } = await supabase.from('client_tags').delete().eq('id', id);
    if (!deleteError) await fetchAll();
    return { error: deleteError?.message ?? null };
  };

  return { tags, assignmentsByClient, isLoading, error, createTag, deleteTag };
}
