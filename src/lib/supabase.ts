import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * False when env vars are missing — the app renders a visible configuration
 * error instead of silently talking to a placeholder backend (audit rec 4.5).
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder-project.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      // Explicit (not just relying on SDK defaults): keep the coach signed
      // in across browser restarts — session + refresh token persist in
      // localStorage and are silently refreshed, so /login is only hit
      // once until the user explicitly signs out.
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      detectSessionInUrl: true,
    },
  },
);
