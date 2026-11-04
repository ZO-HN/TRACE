import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { setDashboardIdentity, verifyDashboardProfile } from '../lib/dashboardAnalyticsCache';
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
  const mountedRef = useRef(false);
  const userRef = useRef<User | null>(null);
  const revisionRef = useRef(0);

  const fetchProfile = async (currentUser: User, revision: number) => {
    const current = () => mountedRef.current && revisionRef.current === revision && userRef.current?.id === currentUser.id;
    try {
      const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
      if (!current()) return;
      if (profileError) throw profileError;
      if (!data || data.id !== currentUser.id) throw new Error('Account profile is unavailable.');
      verifyDashboardProfile(currentUser.id, data as TraceProfile);
      setProfile(data as TraceProfile);
      setError(null);
    } catch (cause: unknown) {
      if (!current()) return;
      verifyDashboardProfile(currentUser.id, null);
      setProfile(null);
      setError(cause instanceof Error ? cause : new Error('Failed to fetch profile'));
    } finally {
      if (current()) setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    const currentUser = userRef.current;
    if (!mountedRef.current || !currentUser) return;
    const revision = ++revisionRef.current;
    await fetchProfile(currentUser, revision);
  };

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    const initialRevision = ++revisionRef.current;
    const acceptUser = (currentUser: User | null) => {
      const revision = ++revisionRef.current;
      const changed = userRef.current?.id !== currentUser?.id;
      userRef.current = currentUser;
      setDashboardIdentity(currentUser?.id ?? null);
      setUser(currentUser);
      setError(null);
      if (changed || !currentUser) setProfile(null);
      setIsLoading(Boolean(currentUser));
      if (currentUser) {
        // Release the Supabase auth callback lock before querying a profile.
        setTimeout(() => {
          if (active && revisionRef.current === revision) void fetchProfile(currentUser, revision);
        }, 0);
      }
    };
    void supabase.auth.getSession().then(({ data: { session }, error: authError }) => {
      if (!active || revisionRef.current !== initialRevision) return;
      if (authError) throw authError;
      acceptUser(session?.user ?? null);
    }).catch((cause: unknown) => {
      if (!active || revisionRef.current !== initialRevision) return;
      setDashboardIdentity(null);
      userRef.current = null;
      setUser(null);
      setProfile(null);
      setError(cause instanceof Error ? cause : new Error('Could not load sign-in session'));
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) acceptUser(session?.user ?? null);
    });
    return () => {
      active = false;
      mountedRef.current = false;
      revisionRef.current += 1;
      subscription.unsubscribe();
      // No cache survives a period without an observing auth boundary.
      setDashboardIdentity(null);
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

