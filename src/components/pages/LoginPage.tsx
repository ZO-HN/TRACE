import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Dumbbell, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Label, Input } from '@/components/ui/shadcn/field';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Dumbbell size={18} className="text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Sign in to Tracked</h1>
          <p className="text-sm text-muted-foreground text-center">Coach dashboard — sign in with your coach account.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coach@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Password</Label>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          You'll stay signed in on this device until you sign out.
        </p>
      </div>
    </div>
  );
}
