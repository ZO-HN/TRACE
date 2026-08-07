import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/shadcn/field';
import AuthCard from '@/components/auth/AuthCard';
import OAuthButtons from '@/components/auth/OAuthButtons';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Coach-only web dashboard — every signup here is a coach account.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { role: 'coach' },
        emailRedirectTo: window.location.origin,
      },
    });

    setSubmitting(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthCard title="Check your email" subtitle={`We sent a signup link to ${email}.`}>
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle2 size={32} className="text-success" />
          <p className="text-sm text-muted-foreground text-center">
            Click the link in that email to finish creating your account.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Use a different email
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Signup"
      subtitle="Enter your email below to signup to Tracked"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="h-12 text-center"
        />

        {error && <p className="text-sm text-danger text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !email}
          className="flex items-center justify-center gap-2 h-11 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? 'Sending link...' : 'Signup with Email'}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] font-medium text-muted-foreground tracking-wide">OR CONTINUE WITH</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <OAuthButtons />

        <p className="text-xs text-muted-foreground text-center mt-1">
          Already using the Tracked app on mobile? Continue with the same account to keep everything in sync.
        </p>
      </form>
    </AuthCard>
  );
}
