import { supabase } from './supabase';

export function startGoogleSignIn(redirectTo = window.location.origin) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { prompt: 'select_account' },
    },
  });
}

export async function switchGoogleAccount() {
  const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (oauthError || !data.url) return { error: oauthError ?? new Error('Could not start Google sign-in.') };

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) return { error: signOutError };
  window.location.assign(data.url);
  return { error: null };
}
