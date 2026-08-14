import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, Link } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Dumbbell,
  Footprints,
  Heart,
  Info,
  Loader2,
  Mail,
  Pencil,
  PlayCircle,
  Ruler,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  User,
  UtensilsCrossed,
  Wrench,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/shadcn/field';
import OAuthButtons from '@/components/auth/OAuthButtons';
import {
  DEFAULT_ONBOARDING_SCREENS,
  decodeScreensConfig,
  parseInviteConfig,
  STEP_DEFS,
  type OnboardingScreen,
  type StepDef,
} from '@/config/onboardingScreens';

const STEP_ICONS: Record<string, typeof User> = {
  name: User,
  email: Mail,
  dob: Calendar,
  height: Ruler,
  weight: Scale,
  'current-goal': Target,
  'current-workouts': Dumbbell,
  'current-training-split': Dumbbell,
  'exercise-selection': PlayCircle,
  'equipment-list-gym': Wrench,
  injuries: AlertTriangle,
  'avg-cardio-per-week': Heart,
  'avg-steps-per-day': Footprints,
  'food-preferences': Sparkles,
  allergies: AlertTriangle,
  'daily-calories': Calculator,
  'daily-macros': Calculator,
  'avg-number-meals-per-day': UtensilsCrossed,
  'meals-you-usually-eat': UtensilsCrossed,
  'num-meals-before-gym': UtensilsCrossed,
  'pre-workout-meal': UtensilsCrossed,
  'recent-physique-shots': Camera,
};

const CATEGORY_MAP: { title: string; icon: typeof User; keys: string[] }[] = [
  { title: 'Personal Information', icon: User, keys: ['name', 'email', 'dob', 'height', 'weight'] },
  {
    title: 'Training Background',
    icon: Heart,
    keys: [
      'current-goal',
      'current-workouts',
      'current-training-split',
      'exercise-selection',
      'equipment-list-gym',
      'injuries',
      'avg-cardio-per-week',
      'avg-steps-per-day',
    ],
  },
  {
    title: 'Nutrition Habits',
    icon: UtensilsCrossed,
    keys: [
      'food-preferences',
      'allergies',
      'daily-calories',
      'daily-macros',
      'avg-number-meals-per-day',
      'meals-you-usually-eat',
      'num-meals-before-gym',
      'pre-workout-meal',
    ],
  },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function TagInput({
  value,
  onChange,
  def,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  def: StepDef;
}) {
  const [draft, setDraft] = useState('');
  const excluded = def.exclusiveOption && value.includes(def.exclusiveOption);

  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    onChange([...value.filter((v) => v !== def.exclusiveOption), ...parts]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && !excluded && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary px-3 py-1 text-sm font-medium"
            >
              {tag}
              <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {!excluded && (
        <>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                commit(draft);
              }
            }}
            onBlur={() => draft.trim() && commit(draft)}
            placeholder={def.placeholder}
            className="h-14 w-full rounded-xl border-2 border-primary/60 bg-card px-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted-foreground">Press Enter or comma to add — paste a list to add several at once</p>
        </>
      )}

      {def.suggestions && !excluded && (
        <div className="flex flex-wrap gap-2">
          {def.suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange([...value, s])}
                className="text-xs font-medium rounded-full border border-dashed border-border px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                + {s}
              </button>
            ))}
        </div>
      )}

      {def.exclusiveOption && (
        <button
          type="button"
          onClick={() => onChange(excluded ? [] : [def.exclusiveOption!])}
          className={cn(
            'flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left transition-colors',
            excluded ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border text-foreground hover:border-primary/40',
          )}
        >
          {def.exclusiveOption}
          <span
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
              excluded ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground',
            )}
          >
            {excluded && <Check size={12} />}
          </span>
        </button>
      )}
    </div>
  );
}

function SingleChoice({ def, value, onChange }: { def: StepDef; value: string; onChange: (v: string) => void }) {
  const [otherText, setOtherText] = useState(value && !def.options?.includes(value) ? value : '');
  const isOtherSelected = def.allowOther && otherText.length > 0 && value === otherText;
  const otherActive = def.allowOther && (value === '__other__' || isOtherSelected);

  return (
    <div className="flex flex-col gap-2">
      {def.options!.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left transition-colors',
              selected ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border text-foreground hover:border-primary/40',
            )}
          >
            {opt}
            <span
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground',
              )}
            >
              {selected && <Check size={12} />}
            </span>
          </button>
        );
      })}
      {def.allowOther && (
        <button
          type="button"
          onClick={() => onChange(otherText || '__other__')}
          className={cn(
            'flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left transition-colors',
            otherActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
          )}
        >
          <span className={cn('font-semibold', otherActive ? 'text-primary' : 'text-foreground')}>Other</span>
          <span
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
              otherActive ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground',
            )}
          >
            {otherActive && <Check size={12} />}
          </span>
        </button>
      )}
      {otherActive && (
        <input
          autoFocus
          value={otherText}
          onChange={(e) => {
            setOtherText(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Tell us more..."
          className="h-12 w-full rounded-xl border-2 border-primary/60 bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
        />
      )}
    </div>
  );
}

function HeightStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [unit, setUnit] = useState<'ftin' | 'cm'>('ftin');
  const heightOptions = useMemo(() => {
    const opts: string[] = [];
    for (let totalIn = 47; totalIn <= 95; totalIn++) {
      opts.push(`${Math.floor(totalIn / 12)}'${totalIn % 12}`);
    }
    return opts;
  }, []);
  const cmInvalid = unit === 'cm' && value !== '' && (Number(value) < 100 || Number(value) > 250 || Number.isNaN(Number(value)));

  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex w-fit rounded-lg border border-border p-1 gap-1">
        {(['ftin', 'cm'] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => {
              setUnit(u);
              onChange('');
            }}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              unit === u ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {u === 'ftin' ? 'ft/in' : 'cm'}
          </button>
        ))}
      </div>

      {unit === 'ftin' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 w-full rounded-xl border-2 border-primary/60 bg-card px-4 text-base text-foreground outline-none focus:border-primary transition-colors"
        >
          <option value="">Select your height</option>
          {heightOptions.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      ) : (
        <>
          <div
            className={cn(
              'flex items-center rounded-xl border-2 bg-card px-4 transition-colors',
              cmInvalid ? 'border-danger' : 'border-primary/60 focus-within:border-primary',
            )}
          >
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter your height"
              className="h-14 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
            />
            <span className="text-sm text-muted-foreground">cm</span>
          </div>
          {cmInvalid && <p className="text-xs text-danger">Please enter a valid height (100-250 cm)</p>}
        </>
      )}
    </div>
  );
}

function WeightStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const range = unit === 'kg' ? [25, 350] : [55, 770];
  const invalid = value !== '' && (Number(value) < range[0] || Number(value) > range[1] || Number.isNaN(Number(value)));

  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex w-fit rounded-lg border border-border p-1 gap-1">
        {(['lbs', 'kg'] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => {
              setUnit(u);
              onChange('');
            }}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              unit === u ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {u}
          </button>
        ))}
      </div>
      <div
        className={cn(
          'flex items-center rounded-xl border-2 bg-card px-4 transition-colors',
          invalid ? 'border-danger' : 'border-primary/60 focus-within:border-primary',
        )}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your weight"
          className="h-14 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
        />
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      {invalid && (
        <p className="text-xs text-danger">
          Please enter a valid weight ({range[0]}-{range[1]} {unit})
        </p>
      )}
    </div>
  );
}

function DobStep({ value, onChange }: { value: { month: string; day: string; year: string }; onChange: (v: typeof value) => void }) {
  const years = useMemo(() => {
    const current = 2026;
    return Array.from({ length: 90 }, (_, i) => String(current - 10 - i));
  }, []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1)), []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">Month</label>
        <select
          value={value.month}
          onChange={(e) => onChange({ ...value, month: e.target.value })}
          className="h-14 rounded-xl border-2 border-border bg-card px-3 text-base text-foreground outline-none focus:border-primary transition-colors"
        >
          <option value="">Month</option>
          {MONTHS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">Day</label>
        <select
          value={value.day}
          onChange={(e) => onChange({ ...value, day: e.target.value })}
          className="h-14 rounded-xl border-2 border-border bg-card px-3 text-base text-foreground outline-none focus:border-primary transition-colors"
        >
          <option value="">Day</option>
          {days.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">Year</label>
        <select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value })}
          className="h-14 rounded-xl border-2 border-primary/60 bg-card px-3 text-base text-foreground outline-none focus:border-primary transition-colors"
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PhotoStep() {
  return (
    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-10 cursor-pointer hover:border-primary/50 transition-colors">
      <Camera size={24} className="text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">Click to upload photos</span>
      <span className="text-xs text-muted-foreground">Optional — you can skip this step</span>
      <input type="file" accept="image/*" multiple className="hidden" />
    </label>
  );
}

function MacrosStep({ value, onChange }: { value: Macros; onChange: (v: Macros) => void }) {
  const fields: { key: keyof Macros; label: string; placeholder: string }[] = [
    { key: 'protein', label: 'Protein', placeholder: 'e.g. 120 (or leave blank)' },
    { key: 'carbs', label: 'Carbs', placeholder: 'e.g. 200 (or leave blank)' },
    { key: 'fat', label: 'Fat', placeholder: 'e.g. 80 (or leave blank)' },
  ];
  return (
    <div className="flex flex-col gap-4">
      {fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-foreground">{f.label}</label>
          <div className="flex items-center rounded-xl border-2 border-border bg-card px-4 focus-within:border-primary transition-colors">
            <input
              value={value[f.key]}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="h-14 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
            />
            <span className="text-sm text-muted-foreground">grams</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function NoteBox({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-4 mt-3">
      <Info size={16} className="text-primary shrink-0 mt-0.5" />
      <p className="text-sm text-foreground">
        <span className="font-semibold text-primary">Note:</span> {text}
      </p>
    </div>
  );
}

type Macros = { protein: string; carbs: string; fat: string };
type Answer = string | string[] | { month: string; day: string; year: string } | Macros;

export default function OnboardingWizardPage() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const inviteId = useMemo(() => params.get('invite'), [params]);

  // Two link formats: the current server-issued `?invite=<id>` (resolved via
  // get_invite_link, revocable) and the legacy client-side `?config=...`
  // base64 param (still readable for links shared before this system
  // existed, but no longer generated — see onboardingScreens.ts).
  const [invite, setInvite] = useState<{ coachId: string; coachName: string; screens: OnboardingScreen[] } | null>(
    null,
  );
  const [inviteResolving, setInviteResolving] = useState(!!inviteId);
  const [inviteInvalid, setInviteInvalid] = useState(false);

  useEffect(() => {
    if (!inviteId) return;
    let cancelled = false;
    setInviteResolving(true);
    setInviteInvalid(false);
    supabase
      .rpc('get_invite_link', { p_invite_id: inviteId })
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) {
          setInviteInvalid(true);
        } else {
          const row = data as { coach_id: string; coach_first_name: string; screens_config: { k: string; e: boolean }[] };
          setInvite({
            coachId: row.coach_id,
            coachName: row.coach_first_name || 'your coach',
            screens: decodeScreensConfig(row.screens_config),
          });
        }
        setInviteResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteId]);

  const legacyScreens = useMemo(() => (inviteId ? [] : parseInviteConfig(location.search)), [inviteId, location.search]);
  const screens = invite ? invite.screens : legacyScreens;
  const coachName = invite ? invite.coachName : params.get('coach') || 'your coach';
  const coachId = invite ? invite.coachId : params.get('coachId');

  const steps = useMemo(
    () =>
      screens
        .filter((s) => s.enabled)
        .map((s) => ({ ...s, def: STEP_DEFS[s.key] }))
        .filter((s): s is typeof s & { def: StepDef } => !!s.def),
    [screens],
  );

  const [phase, setPhase] = useState<'intro' | 'auth' | 'form' | 'review' | 'done'>('intro');
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [linkCopied, setLinkCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authSent, setAuthSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (phase === 'auth' && userId) setPhase('form');
  }, [phase, userId]);

  const clientId = userId ?? '—';

  const current = steps[stepIndex];
  const percent = steps.length > 0 ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;

  const setAnswer = (key: string, value: Answer) => setAnswers((a) => ({ ...a, [key]: value }));

  const goNext = () => {
    if (stepIndex + 1 >= steps.length) {
      setPhase('review');
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.href },
    });
    setAuthSubmitting(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthSent(true);
  };

  const handleComplete = async () => {
    if (!userId || !coachId) {
      setSubmitError('Missing coach or account info — try reopening this link.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const { data: profileRow } = await supabase.from('profiles').select('coach_id').eq('id', userId).maybeSingle();
    if (profileRow && profileRow.coach_id !== coachId) {
      const { error: claimError } = await supabase.rpc('claim_coach_by_id', { p_coach_id: coachId });
      if (claimError) {
        setSubmitting(false);
        setSubmitError(
          claimError.message.includes('already have a coach')
            ? "You're already linked to a different coach — contact them to switch."
            : claimError.message,
        );
        return;
      }
    }

    const { error: insertError } = await supabase
      .from('onboarding_responses')
      .insert({ trainee_id: userId, coach_id: coachId, answers });
    setSubmitting(false);
    if (insertError) {
      setSubmitError(insertError.message);
      return;
    }
    setPhase('done');
  };

  const jumpToStep = (key: string) => {
    const idx = steps.findIndex((s) => s.key === key);
    if (idx >= 0) {
      setStepIndex(idx);
      setPhase('form');
    }
  };

  const formatAnswer = (key: string): string => {
    const val = answers[key];
    if (val == null) return '—';
    if (Array.isArray(val)) return val.length ? val.join(', ') : '—';
    if (typeof val === 'string') return val.trim() ? val : '—';
    if ('month' in val) {
      const monthIdx = MONTHS.indexOf(val.month);
      if (!val.month || !val.day || !val.year) return '—';
      return `${monthIdx + 1}/${val.day}/${val.year}`;
    }
    if ('protein' in val) {
      const parts = [val.protein && `${val.protein}g protein`, val.carbs && `${val.carbs}g carbs`, val.fat && `${val.fat}g fat`].filter(
        Boolean,
      );
      return parts.length ? parts.join(' / ') : '—';
    }
    return '—';
  };

  const REVIEW_CATEGORIES: { key: 'personal' | 'training' | 'nutrition'; title: string; icon: typeof User }[] = [
    { key: 'personal', title: 'Personal', icon: User },
    { key: 'training', title: 'Training', icon: Dumbbell },
    { key: 'nutrition', title: 'Nutrition', icon: UtensilsCrossed },
  ];

  const goBack = () => {
    if (stepIndex === 0) {
      setPhase('intro');
    } else {
      setStepIndex((i) => i - 1);
    }
  };

  const estMinutes = Math.max(2, Math.round(steps.length * 0.4));

  if (inviteResolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (inviteInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-sm text-center flex flex-col items-center gap-2">
          <AlertTriangle size={28} className="text-muted-foreground" />
          <p className="text-sm font-semibold">This invite link is no longer valid</p>
          <p className="text-xs text-muted-foreground">
            It may have been revoked or replaced with a newer one. Ask your coach for a fresh invite link.
          </p>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <p className="text-muted-foreground text-sm">This invite link doesn't have any onboarding screens enabled.</p>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <div className="flex-1 flex flex-col items-center px-6 py-16 max-w-2xl mx-auto w-full">
          <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
            <User size={32} className="text-primary" />
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 mb-6">
            <Clock size={12} /> {estMinutes}-{estMinutes + 5} minutes
          </span>
          <h1 className="text-3xl font-extrabold text-center mb-3">Welcome to {coachName}</h1>
          <p className="text-center text-muted-foreground mb-8 max-w-md">
            Help {coachName} create the perfect training and nutrition plan by sharing some information about yourself.
          </p>

          <div className="w-full flex flex-col gap-3 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What we'll cover</p>
            {CATEGORY_MAP.filter((c) => c.keys.some((k) => steps.some((s) => s.key === k))).map((c) => (
              <div key={c.title} className="flex items-center gap-3 rounded-xl border border-border p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <c.icon size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.title === 'Personal Information' && 'Basic details like name, age, and physical stats'}
                    {c.title === 'Training Background' && 'Your fitness goals, experience, and preferences'}
                    {c.title === 'Nutrition Habits' && 'Dietary preferences, allergies, and eating patterns'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-primary">Your information is secure and private</p>
              <p className="text-xs text-muted-foreground">Only your coach will see this information to provide personalized guidance.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-surface px-6 py-5 flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={!authChecked}
            onClick={() => setPhase(userId ? 'form' : 'auth')}
            className="w-full max-w-2xl flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            Get Started <ArrowRight size={16} />
          </button>
          {!coachId && (
            <p className="text-xs text-danger text-center max-w-md">
              This link doesn't have a coach attached — ask your coach to re-share their invite link.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'auth') {
    if (authSent) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
          <div className="max-w-sm w-full flex flex-col items-center text-center gap-3">
            <CheckCircle2 size={32} className="text-primary" />
            <h1 className="text-xl font-bold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a sign-in link to {authEmail}. Click it to come back here and continue.
            </p>
            <button type="button" onClick={() => setAuthSent(false)} className="text-sm font-medium text-primary hover:underline">
              Use a different email
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
        <div className="max-w-sm w-full flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-bold">Sign in to continue</h1>
            <p className="text-sm text-muted-foreground">
              We need your email so {coachName} can find your answers once you're done.
            </p>
          </div>
          <form onSubmit={(e) => void handleAuthSubmit(e)} className="flex flex-col gap-3">
            <Input
              type="email"
              autoComplete="email"
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-12 text-center"
            />
            {authError && <p className="text-xs text-danger text-center">{authError}</p>}
            <button
              type="submit"
              disabled={authSubmitting || !authEmail}
              className="flex items-center justify-center gap-2 h-11 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {authSubmitting && <Loader2 size={14} className="animate-spin" />}
              {authSubmitting ? 'Sending link...' : 'Continue with Email'}
            </button>
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] font-medium text-muted-foreground tracking-wide">OR CONTINUE WITH</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <OAuthButtons />
          </form>
          <p className="text-xs text-muted-foreground text-center">
            Already have a TRACE account?{' '}
            <Link to="/login" className="text-primary underline">
              Sign in there instead
            </Link>{' '}
            then reopen this link.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'review') {
    const displayCoach = coachName === 'your coach' ? 'Your coach' : coachName;
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <div className="h-1 bg-primary" />
        <div className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full flex flex-col items-center">
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 mb-4">
            <CheckCircle2 size={12} /> Almost done
          </span>
          <h1 className="text-2xl font-extrabold text-center mb-2">Review Your Information</h1>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
            Review the information below and confirm everything looks correct before finishing.
          </p>

          <div className="w-full flex items-center gap-3 rounded-xl border border-border p-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <User size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Coach</p>
              <p className="text-base font-bold">{displayCoach}</p>
              <p className="text-xs text-muted-foreground font-mono">@{clientId}</p>
            </div>
          </div>

          {REVIEW_CATEGORIES.map((cat) => {
            const keysInCategory = steps.filter((s) => s.def.category === cat.key);
            if (keysInCategory.length === 0) return null;
            return (
              <div key={cat.key} className="w-full rounded-xl border border-border p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <cat.icon size={15} className="text-primary" />
                    </div>
                    <span className="text-base font-bold">{cat.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(keysInCategory[0].key)}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-surface transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {keysInCategory.map((s) => (
                    <div key={s.key} className="flex items-center justify-between text-sm gap-4">
                      <span className="text-muted-foreground">{DEFAULT_ONBOARDING_SCREENS.find((d) => d.key === s.key)?.label ?? s.key}</span>
                      <span className="font-semibold text-right">{formatAnswer(s.key)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="w-full flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              By continuing, you agree to share this information with your coach and accept the{' '}
              <a href="#" className="text-primary underline" onClick={(e) => e.preventDefault()}>
                coaching agreement
              </a>
              .
            </p>
          </div>
        </div>

        <div className="border-t border-border bg-surface px-6 py-4 flex flex-col items-center gap-2 max-w-2xl mx-auto w-full">
          {submitError && <p className="text-xs text-danger text-center">{submitError}</p>}
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleComplete()}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Submitting...' : 'Complete onboarding'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    const displayCoach = coachName === 'your coach' ? 'Your coach' : coachName;
    const shareUrl = window.location.href;
    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } catch {
        window.prompt('Copy this link:', shareUrl);
      }
    };

    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-14">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-1">
            <Check size={24} className="text-primary" />
          </div>
          <span className="rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5">Application sent</span>
          <h1 className="text-2xl font-extrabold">Thanks for reaching out to {displayCoach}</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Your answers were sent to {displayCoach} and your account is linked to them. Download the TRACE app and sign in with the
            same email to see your training and nutrition plan once {displayCoach.toLowerCase()} sets it up.
          </p>

          <div className="w-full rounded-xl border border-border p-5 mt-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <User size={20} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Your coach</p>
                <p className="text-base font-bold">{displayCoach}</p>
                <p className="text-xs text-muted-foreground font-mono">@{clientId}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
            >
              {linkCopied ? <Check size={13} /> : <Copy size={13} />} {linkCopied ? 'Copied' : 'Copy this link'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Share this page to finish onboarding on another device.</p>

          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {[
              { n: 1, title: 'Install the TRACE app', body: 'Download the app on your phone using the App Store or Google Play links below.' },
              {
                n: 2,
                title: 'Log in with the same email',
                body: 'Your account is already linked to your coach — just sign in with the email you used here.',
              },
              {
                n: 3,
                title: 'Wait for your coach',
                body: `${displayCoach} will review your answers and set up your training in the app.`,
              },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-border p-4 text-left">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold mb-3">
                  {s.n}
                </span>
                <p className="text-sm font-semibold mb-1">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="w-full rounded-xl border border-border p-6 mt-2 flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone size={18} className="text-primary" />
            </div>
            <p className="text-base font-bold">Download the TRACE app</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Install the app on your phone and sign in with the same email you used here — your account and coach are already linked.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
              <span className="h-11 px-4 rounded-lg border border-border flex items-center gap-2 text-sm font-medium text-muted-foreground cursor-not-allowed">
                Download on the App Store
              </span>
              <span className="h-11 px-4 rounded-lg border border-border flex items-center gap-2 text-sm font-medium text-muted-foreground cursor-not-allowed">
                Get it on Google Play
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">The TRACE mobile app isn't published yet — these links are placeholders.</p>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Need to update something? You can reopen this onboarding link for {displayCoach} at any time.
          </p>
        </div>
      </div>
    );
  }

  const Icon = STEP_ICONS[current.key] ?? User;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="px-6 py-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Step {stepIndex + 1} of {steps.length}
        </span>
        <span className="text-xs text-muted-foreground">{percent}%</span>
      </div>
      <div className="h-1 bg-border">
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-extrabold mb-2">{current.def.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{current.def.subtitle}</p>

        {current.def.kind === 'text' && (
          <input
            autoFocus
            value={typeof answers[current.key] === 'string' ? (answers[current.key] as string) : ''}
            onChange={(e) => setAnswer(current.key, e.target.value)}
            placeholder={current.def.placeholder}
            className="h-14 w-full rounded-xl border-2 border-primary/60 bg-card px-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        )}

        {current.def.kind === 'email' && (
          <input
            type="email"
            autoFocus
            value={typeof answers[current.key] === 'string' ? (answers[current.key] as string) : ''}
            onChange={(e) => setAnswer(current.key, e.target.value)}
            placeholder="you@example.com"
            className="h-14 w-full rounded-xl border-2 border-primary/60 bg-card px-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        )}

        {current.def.kind === 'dob' && (
          <DobStep
            value={(answers[current.key] as { month: string; day: string; year: string }) ?? { month: '', day: '', year: '' }}
            onChange={(v) => setAnswer(current.key, v)}
          />
        )}

        {current.def.kind === 'height' && (
          <HeightStep
            value={typeof answers[current.key] === 'string' ? (answers[current.key] as string) : ''}
            onChange={(v) => setAnswer(current.key, v)}
          />
        )}

        {current.def.kind === 'weight' && (
          <WeightStep
            value={typeof answers[current.key] === 'string' ? (answers[current.key] as string) : ''}
            onChange={(v) => setAnswer(current.key, v)}
          />
        )}

        {current.def.kind === 'single-choice' && (
          <SingleChoice
            def={current.def}
            value={typeof answers[current.key] === 'string' ? (answers[current.key] as string) : ''}
            onChange={(v) => setAnswer(current.key, v)}
          />
        )}

        {current.def.kind === 'tag-input' && (
          <TagInput
            def={current.def}
            value={Array.isArray(answers[current.key]) ? (answers[current.key] as string[]) : []}
            onChange={(v) => setAnswer(current.key, v)}
          />
        )}

        {current.def.kind === 'macros' && (
          <MacrosStep
            value={
              answers[current.key] && typeof answers[current.key] === 'object' && 'protein' in (answers[current.key] as object)
                ? (answers[current.key] as Macros)
                : { protein: '', carbs: '', fat: '' }
            }
            onChange={(v) => setAnswer(current.key, v)}
          />
        )}

        {current.def.kind === 'photo' && <PhotoStep />}

        {current.def.note && <NoteBox text={current.def.note} />}
      </div>

      <div className="border-t border-border bg-surface px-6 py-4 flex flex-col gap-3 max-w-2xl mx-auto w-full">
        <div className="flex items-start gap-3 rounded-xl border border-border p-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon size={14} className="text-primary" />
          </div>
          <p className="text-sm text-foreground pt-1.5">{current.def.footerText}</p>
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1.5 h-11 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-background transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-1.5 h-11 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {stepIndex + 1 >= steps.length ? 'Finish' : 'Next'} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
