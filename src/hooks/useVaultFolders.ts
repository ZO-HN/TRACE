import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface VaultFolderRow {
  id: string;
  name: string;
  description: string | null;
  visibility: 'all' | 'specific';
  client_ids: string[];
  created_at: string;
}

export interface UseVaultFolders {
  folders: VaultFolderRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createFolder: (input: { name: string; description: string; visibility: 'all' | 'specific'; clientIds: string[] }) => Promise<{
    error: string | null;
  }>;
  deleteFolder: (id: string) => Promise<{ error: string | null }>;
}

type LoadedData = { folders: VaultFolderRow[] };
type LoadScope = { owner: string; request: number };
const emptyData = (): LoadedData => ({ folders: [] });

export function useVaultFolders(coachId: string): UseVaultFolders {
  const [state, setState] = useState<LoadedData & { isLoading: boolean; error: string | null; owner: string }>(
    () => ({ ...emptyData(), owner: coachId, isLoading: Boolean(coachId), error: null }),
  );
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<LoadScope | null>(null);
  const fetchFolders = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope && owner.current === scope.owner;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ ...(previous.owner === scope.owner ? previous : emptyData()), owner: scope.owner, isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('vault_folders')
        .select('id, name, description, visibility, client_ids, created_at')
        .eq('coach_id', scope.owner)
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      const next: LoadedData = { folders: (data as VaultFolderRow[]) ?? [] };
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
    void fetchFolders(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [coachId, fetchFolders]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.owner === coachId && owner.current === coachId) await fetchFolders(scope);
  }, [coachId, fetchFolders]);

  const runMutation = async (operation: (scope: LoadScope) => Promise<{ error: string | null }>) => {
    const scope = active.current;
    if (!scope || scope.owner !== coachId || owner.current !== coachId) return { error: 'The active account changed. Please retry from the current view.' };
    try {
      const result = await operation(scope);
      if (!result.error && active.current === scope && owner.current === scope.owner) await fetchFolders(scope);
      return result;
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not complete the operation. Please retry.' };
    }
  };

  const createFolder: UseVaultFolders['createFolder'] = async ({ name, description, visibility, clientIds }) => runMutation(async () => {
    const { error: insertError } = await supabase.from('vault_folders').insert({
      coach_id: coachId,
      name,
      description: description || null,
      visibility,
      client_ids: visibility === 'specific' ? clientIds : [],
    });
    return { error: insertError?.message ?? null };
  });

  const deleteFolder = async (id: string) => runMutation(async () => {
    const { error: deleteError } = await supabase.from('vault_folders').delete().eq('id', id);
    return { error: deleteError?.message ?? null };
  });

  const visible = state.owner === coachId ? state : { ...emptyData(), isLoading: Boolean(coachId), error: null };
  return { folders: visible.folders, isLoading: visible.isLoading, error: visible.error, refresh, createFolder, deleteFolder };
}
