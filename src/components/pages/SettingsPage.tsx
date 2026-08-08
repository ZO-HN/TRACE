import { useState } from 'react';
import { Bell, LogOut, Palette, Shield, Smartphone, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/shadcn/card';
import { Label, Input, Select } from '@/components/ui/shadcn/field';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { useProfile } from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'app', label: 'App', icon: Smartphone },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
] as const;

type TabId = (typeof TABS)[number]['id'];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-10 h-6 rounded-full shrink-0 transition-colors',
        checked ? 'bg-success' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-4',
        )}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {control}
    </div>
  );
}

function ProfileTab() {
  const profile = useProfile();
  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Contact info</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback className="text-sm">{initials || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>First name</Label>
              <Input defaultValue={profile.first_name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Last name</Label>
              <Input defaultValue={profile.last_name} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input defaultValue={profile.email} disabled />
            <p className="text-xs text-muted-foreground">Your email is used for login and notifications.</p>
          </div>

          <button className="h-10 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function AppearanceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-sm font-semibold">Appearance</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-4">
        <p className="text-xs text-muted-foreground -mt-2">Customize the appearance of the dashboard.</p>
        <div className="flex flex-col gap-1.5 max-w-xs">
          <Label>Language</Label>
          <Select defaultValue="English">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
          </Select>
          <p className="text-xs text-muted-foreground">Choose the language for your dashboard. This only changes what you see.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AppTab() {
  const [weightUnits, setWeightUnits] = useState('Metric (kg)');
  const [bodyweightUnits, setBodyweightUnits] = useState('Metric (kg)');
  const [heightUnits, setHeightUnits] = useState('Metric (cm)');
  const [defaultRest, setDefaultRest] = useState('180');
  const [unilateralRest, setUnilateralRest] = useState('180');
  const [readinessSurvey, setReadinessSurvey] = useState(false);
  const [trackIntensity, setTrackIntensity] = useState(true);
  const [intensityPref, setIntensityPref] = useState('Reps in Reserve (RIR)');
  const [sessionEndSurvey, setSessionEndSurvey] = useState(false);
  const [trackSetVideos, setTrackSetVideos] = useState(false);
  const [showSetNotes, setShowSetNotes] = useState(true);
  const [trackWarmupSets, setTrackWarmupSets] = useState(true);
  const [hideSessionTimer, setHideSessionTimer] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        These are the default client-app behaviors new trainees inherit — trainees can override some of them on their device.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Unit preferences</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground -mt-2">Default measurement units for weight and height.</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Weight units</Label>
              <Select value={weightUnits} onChange={(e) => setWeightUnits(e.target.value)}>
                <option>Metric (kg)</option>
                <option>Imperial (lb)</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Bodyweight units</Label>
              <Select value={bodyweightUnits} onChange={(e) => setBodyweightUnits(e.target.value)}>
                <option>Metric (kg)</option>
                <option>Imperial (lb)</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Height units</Label>
              <Select value={heightUnits} onChange={(e) => setHeightUnits(e.target.value)}>
                <option>Metric (cm)</option>
                <option>Imperial (ft/in)</option>
              </Select>
            </div>
          </div>
          <button className="h-10 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Rest timer settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground -mt-2">
            Default rest periods between sets for bilateral and unilateral exercises.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Default rest period (seconds)</Label>
              <Input
                type="number"
                min={30}
                max={600}
                value={defaultRest}
                onChange={(e) => setDefaultRest(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Rest time for bilateral exercises (30&ndash;600 seconds)</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unilateral rest period (seconds)</Label>
              <Input
                type="number"
                min={30}
                max={600}
                value={unilateralRest}
                onChange={(e) => setUnilateralRest(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Rest time for unilateral exercises (30&ndash;600 seconds)</p>
            </div>
          </div>
          <button className="h-10 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex flex-col gap-4">
          <SettingRow
            title="Readiness survey"
            description="Turn on / off the readiness survey at the beginning of workouts."
            control={<Toggle checked={readinessSurvey} onChange={setReadinessSurvey} />}
          />
          <button className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex flex-col gap-4">
          <SettingRow
            title="Track intensity measurements"
            description="Enables a dropdown for tracking RPE / RIR per set during a workout."
            control={<Toggle checked={trackIntensity} onChange={setTrackIntensity} />}
          />
          {trackIntensity && (
            <div className="flex flex-col gap-1.5 max-w-sm">
              <Label>Intensity measurement preference</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Toggle between Reps in Reserve (RIR) and Rate of Perceived Exertion (RPE).
              </p>
              <Select value={intensityPref} onChange={(e) => setIntensityPref(e.target.value)}>
                <option>Reps in Reserve (RIR)</option>
                <option>Rate of Perceived Exertion (RPE)</option>
              </Select>
            </div>
          )}
          <button className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex flex-col gap-4">
          <SettingRow
            title="Session end survey"
            description="Show a survey at the end of each workout session."
            control={<Toggle checked={sessionEndSurvey} onChange={setSessionEndSurvey} />}
          />
          <button className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex flex-col gap-4">
          <SettingRow
            title="Track set videos"
            description="Enable video recording for exercise sets."
            control={<Toggle checked={trackSetVideos} onChange={setTrackSetVideos} />}
          />
          <button className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex flex-col gap-4">
          <SettingRow
            title="Show set notes"
            description="Display notes field for each set during workouts."
            control={<Toggle checked={showSetNotes} onChange={setShowSetNotes} />}
          />
          <button className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Warmup sets</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground -mt-2">Enable tracking of warmup sets in workout sessions.</p>
          <SettingRow
            title="Track warmup sets"
            description="Allow recording and tracking of warmup sets during workouts."
            control={<Toggle checked={trackWarmupSets} onChange={setTrackWarmupSets} />}
          />
          <button className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Session timer display</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground -mt-2">Control the visibility of the session timer during workouts.</p>
          <SettingRow
            title="Hide session timer"
            description="Hide the session timer from view during active workout sessions."
            control={<Toggle checked={hideSessionTimer} onChange={setHideSessionTimer} />}
          />
          <button className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-sm font-semibold">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-3">
        {['Client check-in submissions', 'New messages', 'Form check uploads', 'Weekly summary email'].map((label) => (
          <label key={label} className="flex items-center justify-between text-sm text-foreground">
            {label}
            <input type="checkbox" defaultChecked className="accent-primary" />
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-sm font-semibold">Security</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-3">
        <button
          onClick={() => void supabase.auth.signOut()}
          className="flex items-center gap-2 h-10 px-4 w-fit rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
        >
          <LogOut size={14} /> Sign out
        </button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('profile');

  return (
    <div className="p-6 flex gap-8 max-w-5xl mx-auto">
      <nav className="w-52 shrink-0 flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-1">
          Your account
        </span>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium text-left transition-colors',
              tab === t.id ? 'bg-surface text-foreground' : 'text-muted-foreground hover:bg-surface hover:text-foreground',
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <h1 className="text-lg font-bold text-foreground">
          {TABS.find((t) => t.id === tab)?.label} settings
        </h1>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'appearance' && <AppearanceTab />}
        {tab === 'app' && <AppTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}
