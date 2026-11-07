import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { DEFAULT_ONBOARDING_SCREENS } from '../../config/onboardingScreens';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/shadcn/dialog';

type Submission = Database['public']['Tables']['onboarding_responses']['Row'];
function answerText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(answerText).join(', ');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, v]) => `${key}: ${answerText(v)}`).join(' / ');
  return 'Not provided';
}

export default function ClientOnboardingDetails({ coachId, clientId }: { coachId: string; clientId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const epoch = useRef(0);
  const reviewLock = useRef(false);
  const key = `${coachId}:${clientId}:${open}:${page}:${retry}`;
  const owner = useRef(key); owner.current = key;
  const [loadedKey, setLoadedKey] = useState('');
  useEffect(() => {
    const generation = ++epoch.current;
    let alive = true;
    setRows([]); setError(null); setReviewing(null); setLoadedKey('');
    reviewLock.current = false;
    if (!open) return;
    setLoading(true);
    void (async () => {
      try {
        const { data, error: failure } = await supabase.from('onboarding_responses').select('*')
          .eq('coach_id', coachId).eq('trainee_id', clientId)
          .order('submitted_at', { ascending: false }).order('id', { ascending: false }).range(page * 20, page * 20 + 19);
        if (failure) throw new Error(failure.message);
        if (alive && epoch.current === generation && owner.current === key) { setRows(data ?? []); setLoadedKey(key); }
      } catch (failure) {
        if (alive && epoch.current === generation && owner.current === key) setError(failure instanceof Error ? failure.message : 'Unable to load answers.');
      } finally { if (alive && epoch.current === generation && owner.current === key) setLoading(false); }
    })();
    return () => { alive = false; epoch.current = generation + 1; };
  }, [coachId, clientId, open, page, retry, key]);
  const markReviewed = async (id: string) => {
    if (reviewLock.current || loadedKey !== key || owner.current !== key) return;
    reviewLock.current = true;
    const generation = epoch.current;
    setReviewing(id); setError(null);
    try {
      const { data, error: failure } = await supabase.rpc('review_client_onboarding', { p_response_id: id });
      if (failure) throw new Error(failure.message);
      if (epoch.current === generation && owner.current === key) setRows(items => items.map(item => item.id === id ? { ...item, reviewed_at: data, reviewed_by: coachId } : item));
    } catch (failure) {
      if (epoch.current === generation && owner.current === key) setError(failure instanceof Error ? failure.message : 'Unable to mark reviewed.');
    } finally { if (epoch.current === generation && owner.current === key) { reviewLock.current = false; setReviewing(null); } }
  };
  const visible = loadedKey === key ? rows : [];
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) setPage(0); }}>
    <button type="button" className="block text-xs text-primary mt-1" onClick={() => setOpen(true)}>Onboarding answers</button>
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Onboarding answers</DialogTitle><DialogDescription>Submitted answers are historical information. They do not automatically create a training or nutrition plan.</DialogDescription></DialogHeader>
      {loading && <p>Loading answers…</p>}
      {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(n => n + 1)}>Retry loading</button></div>}
      {!loading && !error && loadedKey === key && !visible.length && <p>No questionnaire submitted on this page. A client may have joined using a coach code.</p>}
      {visible.map(item => <section key={item.id} className="border border-border rounded-lg p-4 space-y-3">
        <p className="text-sm">Submitted {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : 'date unavailable'}</p>
        <dl className="space-y-3">{Object.entries(item.answers && typeof item.answers === 'object' && !Array.isArray(item.answers) ? item.answers : {}).map(([field, value]) => <div key={field}>
          <dt className="font-semibold">{DEFAULT_ONBOARDING_SCREENS.find(s => s.key === field)?.label ?? field}</dt><dd className="whitespace-pre-wrap break-words text-sm">{answerText(value)}</dd>
        </div>)}</dl>
        {item.reviewed_at ? <p className="text-sm text-primary">Reviewed {new Date(item.reviewed_at).toLocaleString()}</p> : <button type="button" disabled={Boolean(reviewing)} onClick={() => void markReviewed(item.id)}>{reviewing === item.id ? 'Saving…' : 'Mark reviewed'}</button>}
      </section>)}
      <div className="flex justify-between"><button type="button" disabled={page === 0 || loading} onClick={() => setPage(n => n - 1)}>Previous</button><button type="button" disabled={visible.length !== 20 || loading} onClick={() => setPage(n => n + 1)}>Next</button></div>
    </DialogContent>
  </Dialog>;
}
