import { useState } from 'react';
import { supabase } from '@/lib/supabase';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.417 2.045-1.25 2.716-.833.67-1.804.998-2.913.98-.02-1.12.42-2.06 1.25-2.72.83-.67 1.83-1 2.913-.976zM20.5 17.34c-.6 1.34-1.31 2.53-2.13 3.57-.9 1.13-1.98 2.55-3.5 2.55-1.32 0-1.98-.85-3.5-.85-1.53 0-2.24.83-3.5.87-1.5.05-2.64-1.34-3.55-2.46-1.9-2.32-3.36-6.56-1.4-9.42.97-1.42 2.7-2.32 4.57-2.35 1.44-.03 2.8.98 3.68.98.88 0 2.52-1.2 4.26-1.03.72.03 2.75.29 4.05 2.19-.1.06-2.42 1.42-2.4 4.23.03 3.36 2.94 4.48 2.98 4.5-.03.1-.47 1.61-1.56 3.19z" />
    </svg>
  );
}

export default function OAuthButtons({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    // Browser navigates away to Google; no further local state update needed.
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={disabled || loading}
        className="flex items-center justify-center gap-2 h-11 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-surface transition-colors disabled:opacity-60"
      >
        <GoogleIcon /> Google
      </button>
      <button
        type="button"
        disabled
        title="Apple sign-in is not configured for this app yet"
        className="flex items-center justify-center gap-2 h-11 rounded-lg border border-border text-sm font-semibold text-muted-foreground opacity-50 cursor-not-allowed"
      >
        <AppleIcon /> Apple
      </button>
    </div>
  );
}
