import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// ==========================================
// Strict Types — aligned to patched DDL schema
// ==========================================

export type UserRole = 'coach' | 'trainee';
export type ExperienceTier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/**
 * Matches public.profiles exactly.
 * NOTE: estimated_1rm is a generated column in set_logs —
 * it must NEVER appear in any write payload from this app.
 */
export interface TraceProfile {
  id: string;
  email: string;
  role: UserRole;
  is_platform_admin: boolean;
  coach_id: string | null;       // null = solo trainee
  coach_code: string | null;     // set for role='coach' rows; trainees enter this to self-link
  first_name: string;
  last_name: string;
  dob: string | null;
  bio: string | null;
  height_cm: number | null;
  biological_sex: string | null;
  phone: string | null;
  username: string | null;
  avatar_key: string | null;
  experience_level: ExperienceTier;
  primary_goal: string | null;
  injury_notes: string | null;
  wearable_sync_active: boolean;
  premium_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface UseTraceUserReturn {
  user: User | null;
  profile: TraceProfile | null;
  isLoading: boolean;
  error: Error | null;
  // Derived permission states
  isCoach: boolean;
  isCoachedTrainee: boolean;
  isSoloTrainee: boolean;
  refreshProfile: () => Promise<void>;
}

// ==========================================
// Hook Implementation
// ==========================================
export function useTraceUser(): UseTraceUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TraceProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const refreshProfile = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    if (!mountedRef.current) return;
    if (!profileError) setProfile(data as TraceProfile);
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchUserAndProfile(currentUser: User) {
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError) throw profileError;
        if (isMounted) setProfile(data as TraceProfile);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
          setProfile(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    async function init() {
      setIsLoading(true);
      setError(null);

      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError && isMounted) {
        setError(authError);
        setIsLoading(false);
        return;
      }

      const currentUser = session?.user ?? null;
      if (isMounted) setUser(currentUser);

      if (!currentUser) {
        if (isMounted) { setProfile(null); setIsLoading(false); }
        return;
      }

      await fetchUserAndProfile(currentUser);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setIsLoading(false);
      } else {
        fetchUserAndProfile(currentUser);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Derived permission booleans — computed from profile truth. No demo/fake
  // profile fallback: an unauthenticated visitor is unauthenticated — see
  // AppShell, which redirects to /login when profile is null post-load.
  const isCoach = profile?.role === 'coach';
  const isCoachedTrainee = profile?.role === 'trainee' && profile.coach_id != null;
  const isSoloTrainee = profile?.role === 'trainee' && profile.coach_id == null;

  return {
    user,
    profile,
    isLoading,
    error,
    isCoach,
    isCoachedTrainee,
    isSoloTrainee,
    refreshProfile,
  };
}

