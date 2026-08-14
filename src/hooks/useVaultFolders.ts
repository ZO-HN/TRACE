import { useEffect, useRef, useState } from 'react';
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
  createFolder: (input: { name: string; description: string; visibility: 'all' | 'specific'; clientIds: string[] }) => Promise<{
    error: string | null;
  }>;
  deleteFolder: (id: string) => Promise<{ error: string | null }>;
}

export function useVaultFolders(coachId: string): UseVaultFolders {
  const [folders, setFolders] = useState<VaultFolderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchFolders = async () => {
    const { data, error: queryError } = await supabase
      .from('vault_folders')
      .select('id, name, description, visibility, client_ids, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });
    if (!mountedRef.current) return;
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setFolders((data as VaultFolderRow[]) ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchFolders();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createFolder: UseVaultFolders['createFolder'] = async ({ name, description, visibility, clientIds }) => {
    const { error: insertError } = await supabase.from('vault_folders').insert({
      coach_id: coachId,
      name,
      description: description || null,
      visibility,
      client_ids: visibility === 'specific' ? clientIds : [],
    });
    if (!insertError) await fetchFolders();
    return { error: insertError?.message ?? null };
  };

  const deleteFolder = async (id: string) => {
    const { error: deleteError } = await supabase.from('vault_folders').delete().eq('id', id);
    if (!deleteError) await fetchFolders();
    return { error: deleteError?.message ?? null };
  };

  return { folders, isLoading, error, createFolder, deleteFolder };
}
