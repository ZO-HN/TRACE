// Server-issued onboarding invite link — replaces the old client-side-only
// base64-config link (see onboardingScreens.ts). One active link per coach;
// generating a new one revokes whichever was active (rotatable, matches
// how a real invite link should behave — see
// supabase/migrations/20260814020000_server_invite_links.sql).

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { OnboardingScreen } from '../config/onboardingScreens';

export interface InviteLinkRow {
  id: string;
  status: 'active' | 'revoked';
  created_at: string;
}

export interface UseInviteLink {
  invite: InviteLinkRow | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  generateLink: (screens: OnboardingScreen[]) => Promise<{ error: string | null }>;
  revokeLink: () => Promise<{ error: string | null }>;
}

type LoadedData = { invite: InviteLinkRow | null };
type LoadScope = { owner: string; request: number };
const emptyData = (): LoadedData => ({ invite: null });

export function useInviteLink(coachId: string): UseInviteLink {
  const [state, setState] = useState<LoadedData & { isLoading: boolean; error: string | null; owner: string }>(
    () => ({ ...emptyData(), owner: coachId, isLoading: Boolean(coachId), error: null }),
  );
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<LoadScope | null>(null);
  const fetchInvite = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope && owner.current === scope.owner;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ ...(previous.owner === scope.owner ? previous : emptyData()), owner: scope.owner, isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('client_invites')
        .select('id, status, created_at')
        .eq('coach_id', scope.owner)
        .eq('status', 'active')
        .maybeSingle();
      if (queryError) throw new Error(queryError.message);
      const next: LoadedData = { invite: (data as InviteLinkRow) ?? null };
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
    void fetchInvite(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [coachId, fetchInvite]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.owner === coachId && owner.current === coachId) await fetchInvite(scope);
  }, [coachId, fetchInvite]);

  const runMutation = async (operation: (scope: LoadScope) => Promise<{ error: string | null }>) => {
    const scope = active.current;
    if (!scope || scope.owner !== coachId || owner.current !== coachId) return { error: 'The active account changed. Please retry from the current view.' };
    try {
      const result = await operation(scope);
      if (!result.error && active.current === scope && owner.current === scope.owner) await fetchInvite(scope);
      return result;
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not complete the operation. Please retry.' };
    }
  };

  const generateLink: UseInviteLink['generateLink'] = async (screens) => runMutation(async () => {
    const payload = screens.map((s) => ({ k: s.key, e: s.enabled }));
    const { error: rpcError } = await supabase.rpc('rotate_invite_link', {
      p_coach_id: coachId,
      p_screens_config: payload,
    });
    return { error: rpcError?.message ?? null };
  });

  const revokeLink: UseInviteLink['revokeLink'] = async () => runMutation(async () => {
    const { error: rpcError } = await supabase.rpc('revoke_invite_link', { p_coach_id: coachId });
    return { error: rpcError?.message ?? null };
  });

  const visible = state.owner === coachId ? state : { ...emptyData(), isLoading: Boolean(coachId), error: null };
  return { invite: visible.invite, isLoading: visible.isLoading, error: visible.error, refresh, generateLink, revokeLink };
}
