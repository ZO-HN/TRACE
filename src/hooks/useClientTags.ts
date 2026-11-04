// Coach-authored client tags (Clients page → Tags dialog) + which clients
// each tag is assigned to (Clients page → per-row Tags popover).

import { useCallback, useEffect, useRef, useState } from 'react';
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
  refresh: () => Promise<void>;
  createTag: (name: string, color: string) => Promise<{ error: string | null }>;
  deleteTag: (id: string) => Promise<{ error: string | null }>;
  assignTag: (clientId: string, tagId: string) => Promise<{ error: string | null }>;
  unassignTag: (clientId: string, tagId: string) => Promise<{ error: string | null }>;
}

type LoadedData = { tags: ClientTag[]; assignmentsByClient: Map<string, ClientTag[]> };
type LoadScope = { owner: string; request: number };
const emptyData = (): LoadedData => ({ tags: [], assignmentsByClient: new Map() });

export function useClientTags(coachId: string): UseClientTags {
  const [state, setState] = useState<LoadedData & { isLoading: boolean; error: string | null; owner: string }>(
    () => ({ ...emptyData(), owner: coachId, isLoading: Boolean(coachId), error: null }),
  );
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<LoadScope | null>(null);
  const fetchAll = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope && owner.current === scope.owner;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ ...(previous.owner === scope.owner ? previous : emptyData()), owner: scope.owner, isLoading: true, error: null }));
    try {
      const [{ data: tagRows, error: tagError }, { data: assignRows, error: assignError }] = await Promise.all([
        supabase.from('client_tags').select('id, name, color, created_at').eq('coach_id', scope.owner).order('created_at'),
        supabase.from('client_tag_assignments').select('tag_id, client_id'),
      ]);
      const queryError = tagError ?? assignError;
      if (queryError) throw new Error(queryError.message);
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
      const next: LoadedData = { tags: tagList, assignmentsByClient: byClient };
      if (current() && scope.request === request) setState({ ...next, owner: scope.owner, isLoading: false, error: null });
    } catch (cause) {
      if (current() && scope.request === request) setState((previous) => ({ ...previous, isLoading: false,
        error: cause instanceof Error ? cause.message : 'Could not load data. Please retry.' }));
    }
  }, []);

  useEffect(() => {
    if (!coachId) {
      active.current = null;
      setState({ ...emptyData(), owner: coachId, isLoading: false, error: null });
      return;
    }
    const scope: LoadScope = { owner: coachId, request: 0 };
    active.current = scope;
    void fetchAll(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [coachId, fetchAll]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.owner === coachId && owner.current === coachId) await fetchAll(scope);
  }, [coachId, fetchAll]);

  const runMutation = async (operation: (scope: LoadScope) => Promise<{ error: string | null }>) => {
    const scope = active.current;
    if (!scope || scope.owner !== coachId || owner.current !== coachId) return { error: 'The active account changed. Please retry from the current view.' };
    try {
      const result = await operation(scope);
      if (!result.error && active.current === scope && owner.current === scope.owner) await fetchAll(scope);
      return result;
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not complete the operation. Please retry.' };
    }
  };

  const createTag: UseClientTags['createTag'] = async (name, color) => runMutation(async () => {
    const { error: insertError } = await supabase.from('client_tags').insert({ coach_id: coachId, name: name.trim(), color });
    return { error: insertError?.message ?? null };
  });

  const deleteTag: UseClientTags['deleteTag'] = async (id) => runMutation(async () => {
    const { error: deleteError } = await supabase.from('client_tags').delete().eq('id', id);
    return { error: deleteError?.message ?? null };
  });

  const assignTag: UseClientTags['assignTag'] = async (clientId, tagId) => runMutation(async () => {
    const { error: insertError } = await supabase
      .from('client_tag_assignments')
      .insert({ client_id: clientId, tag_id: tagId });
    return { error: insertError?.message ?? null };
  });

  const unassignTag: UseClientTags['unassignTag'] = async (clientId, tagId) => runMutation(async () => {
    const { error: deleteError } = await supabase
      .from('client_tag_assignments')
      .delete()
      .eq('client_id', clientId)
      .eq('tag_id', tagId);
    return { error: deleteError?.message ?? null };
  });

  const visible = state.owner === coachId ? state : { ...emptyData(), isLoading: Boolean(coachId), error: null };
  return { tags: visible.tags, assignmentsByClient: visible.assignmentsByClient, isLoading: visible.isLoading, error: visible.error, refresh, createTag, deleteTag, assignTag, unassignTag };
}
