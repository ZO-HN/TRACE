// Server-issued onboarding invite link — replaces the old client-side-only
// base64-config link (see onboardingScreens.ts). One active link per coach;
// generating a new one revokes whichever was active (rotatable, matches
// how a real invite link should behave — see
// supabase/migrations/20260814020000_server_invite_links.sql).

import { useEffect, useRef, useState } from 'react';
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
  generateLink: (screens: OnboardingScreen[]) => Promise<{ error: string | null }>;
  revokeLink: () => Promise<{ error: string | null }>;
}

export function useInviteLink(coachId: string): UseInviteLink {
  const [invite, setInvite] = useState<InviteLinkRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchInvite = async () => {
    const { data, error: queryError } = await supabase
      .from('client_invites')
      .select('id, status, created_at')
      .eq('coach_id', coachId)
      .eq('status', 'active')
      .maybeSingle();
    if (!mountedRef.current) return;
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setInvite((data as InviteLinkRow) ?? null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchInvite();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const generateLink: UseInviteLink['generateLink'] = async (screens) => {
    const payload = screens.map((s) => ({ k: s.key, e: s.enabled }));
    const { error: rpcError } = await supabase.rpc('rotate_invite_link', {
      p_coach_id: coachId,
      p_screens_config: payload,
    });
    if (!rpcError) await fetchInvite();
    return { error: rpcError?.message ?? null };
  };

  const revokeLink: UseInviteLink['revokeLink'] = async () => {
    const { error: rpcError } = await supabase.rpc('revoke_invite_link', { p_coach_id: coachId });
    if (!rpcError) await fetchInvite();
    return { error: rpcError?.message ?? null };
  };

  return { invite, isLoading, error, generateLink, revokeLink };
}
