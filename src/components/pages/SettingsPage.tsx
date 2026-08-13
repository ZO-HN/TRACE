import { useState } from 'react';
import {
  Bell,
  Check,
  Copy,
  Eye,
  ExternalLink,
  GripVertical,
  Link2,
  ListChecks,
  Plus,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Trash2,
  User,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/shadcn/card';
import { Label, Input, Select, Textarea } from '@/components/ui/shadcn/field';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/shadcn/dialog';
import { useProfile } from '@/components/layout/AppShell';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useCoachAllowlist } from '@/hooks/useCoachAllowlist';
import { DEFAULT_ONBOARDING_SCREENS, buildInviteLink, type OnboardingScreen } from '@/config/onboardingScreens';

const ACCOUNT_TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'app', label: 'App', icon: Smartphone },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;

const CLIENT_EXPERIENCE_TABS = [{ id: 'onboarding', label: 'Client onboarding screens', icon: ListChecks }] as const;

const PLATFORM_ADMIN_TABS = [{ id: 'coach-access', label: 'Coach access', icon: ShieldCheck }] as const;

const TABS = [...ACCOUNT_TABS, ...CLIENT_EXPERIENCE_TABS, ...PLATFORM_ADMIN_TABS];

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

const HEIGHT_OPTIONS = ['152 cm', '160 cm', '168 cm', '175 cm', '182 cm', '190 cm', '198 cm'];
const BIOLOGICAL_SEX_OPTIONS = ['Prefer not to say', 'Male', 'Female'];

function ProfileTab() {
  const profile = useProfile();
  const { toast } = useToast();
  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase();

  const [firstName, setFirstName] = useState(profile.first_name ?? '');
  const [lastName, setLastName] = useState(profile.last_name ?? '');
  const [bio, setBio] = useState('');
  const [height, setHeight] = useState('182 cm');
  const [dob, setDob] = useState('');
  const [biologicalSex, setBiologicalSex] = useState('Prefer not to say');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState(`${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatarUrl(URL.createObjectURL(file));
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Attributes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground -mt-2">Add your height and date of birth to your profile.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Height</Label>
              <Select value={height} onChange={(e) => setHeight(e.target.value)}>
                {HEIGHT_OPTIONS.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Your height may be used on the leaderboards to compare your performance with others
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date of birth</Label>
              <Input type="date" placeholder="Pick a date" value={dob} onChange={(e) => setDob(e.target.value)} />
              <p className="text-xs text-muted-foreground">Your date of birth is used to calculate your age.</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">May be used within team data by coaches.</p>
            <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Save
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Personal Info</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground -mt-2">Update your personal information.</p>
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              {avatarUrl ? <AvatarImage src={avatarUrl} /> : <AvatarFallback className="text-sm">{initials || '?'}</AvatarFallback>}
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {firstName} {lastName}
              </p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Given Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Family Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Bio</Label>
            <Textarea
              placeholder="Tell us a little bit about yourself"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Personal information.</p>
            <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Save
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Biological Sex</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <Select value={biologicalSex} onChange={(e) => setBiologicalSex(e.target.value)} className="max-w-xs">
            {BIOLOGICAL_SEX_OPTIONS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Workout suggestions may be based on this.</p>
            <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Save
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Contact Info</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground -mt-2">Update your contact information.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Phone #</Label>
              <Input placeholder="604-555-5555" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input defaultValue={profile.email} disabled />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Your email is used for login and notifications.</p>
            <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Save
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Username</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground -mt-2">This is your username within TRACE. It must be unique.</p>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Usernames connect you to other users on <strong className="text-foreground">TRACE</strong>.
            </p>
            <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Save
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Profile Avatar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-xs text-muted-foreground">This is your profile's avatar.</p>
              <p className="text-xs text-muted-foreground">Click on the avatar to upload a custom one from your files.</p>
            </div>
            <label className="cursor-pointer shrink-0">
              <Avatar className="size-16 rounded-xl">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} className="rounded-xl" />
                ) : (
                  <AvatarFallback className="text-lg rounded-xl">{initials || '?'}</AvatarFallback>
                )}
              </Avatar>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
            </label>
          </div>
          <button
            onClick={() => toast('Successfully updated profile settings.')}
            disabled={!avatarUrl}
            className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end disabled:opacity-40 disabled:pointer-events-none"
          >
            Save
          </button>
        </CardContent>
      </Card>

      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle className="text-danger text-sm font-semibold">Delete account</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Your account will be scheduled for deletion in 30 days. You can sign back in any time within that window to
            recover it. After 30 days, deletion is permanent.
          </p>
          <button
            onClick={() => setDeleteDialogOpen(true)}
            className="h-11 rounded-lg bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Delete account
          </button>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Account deletion isn't available yet in this dashboard — contact support to schedule a deletion in the
            meantime.
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AppTab() {
  const { toast } = useToast();
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
          <button onClick={() => toast('Successfully updated profile settings.')} className="h-10 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
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
          <button onClick={() => toast('Successfully updated profile settings.')} className="h-10 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
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
          <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
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
          <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
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
          <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
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
          <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
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
          <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
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
          <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
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
          <button onClick={() => toast('Successfully updated profile settings.')} className="h-9 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity self-end">
            Save
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function OnboardingScreensTab() {
  const profile = useProfile();
  const { toast } = useToast();
  const [screens, setScreens] = useState<OnboardingScreen[]>(DEFAULT_ONBOARDING_SCREENS);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyInviteLink = async () => {
    const link = buildInviteLink(screens, profile.first_name ?? '', profile.id);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this invite link:', link);
    }
  };

  const enabledCount = screens.filter((s) => s.enabled).length;

  const toggleScreen = (key: string) =>
    setScreens((s) => s.map((screen) => (screen.key === key ? { ...screen, enabled: !screen.enabled } : screen)));

  const reorder = (overKey: string) => {
    if (!dragKey || dragKey === overKey) return;
    setScreens((s) => {
      const from = s.findIndex((x) => x.key === dragKey);
      const to = s.findIndex((x) => x.key === overKey);
      if (from === -1 || to === -1) return s;
      const next = [...s];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground -mt-1">
        Configure which screens your clients will see during onboarding. Drag to reorder and toggle to enable/disable screens.
      </p>

      <Card>
        <CardContent className="pt-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Link2 size={14} className="text-primary" /> Invite link
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Share this link with a new client. It opens the onboarding form below, built from whichever screens are
            enabled here.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy invite link'}
            </button>
            <a
              href={buildInviteLink(screens, profile.first_name ?? '', profile.id)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
            >
              <ExternalLink size={13} /> Preview
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Enabled screens: {enabledCount} / {screens.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScreens(DEFAULT_ONBOARDING_SCREENS)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
          >
            <RotateCcw size={13} /> Reset to Default
          </button>
          <button
            type="button"
            onClick={() => toast('Successfully updated onboarding screens.')}
            className="h-9 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {screens.map((screen) => (
          <div
            key={screen.key}
            draggable
            onDragStart={() => setDragKey(screen.key)}
            onDragOver={(e) => {
              e.preventDefault();
              reorder(screen.key);
            }}
            onDragEnd={() => setDragKey(null)}
            className={cn(
              'flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors',
              dragKey === screen.key && 'opacity-50',
            )}
          >
            <GripVertical size={14} className="text-muted-foreground cursor-grab shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{screen.label}</span>
                {screen.required && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Required
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-mono">{screen.key}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPreviewKey((k) => (k === screen.key ? null : screen.key));
                const single: OnboardingScreen[] = [{ ...screen, enabled: true }];
                window.open(buildInviteLink(single, profile.first_name ?? '', profile.id), '_blank', 'noreferrer');
              }}
              aria-label={`Preview ${screen.label}`}
              className={cn(
                'p-1.5 rounded-md shrink-0 transition-colors',
                previewKey === screen.key ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-surface',
              )}
            >
              <Eye size={14} />
            </button>
            <Toggle
              checked={screen.enabled}
              onChange={() => toggleScreen(screen.key)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachAccessTab() {
  const profile = useProfile();
  const { entries, isLoading, error, addEmail, removeEmail } = useCoachAllowlist();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    setFormError(null);
    const { error: addError } = await addEmail(email, note, profile.id);
    setSubmitting(false);
    if (addError) {
      setFormError(addError);
      return;
    }
    setEmail('');
    setNote('');
    toast('Coach invite added.');
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground -mt-1">
        Only emails on this list can ever become a coach account — via email login link or Google sign-in. Everyone
        else who signs in gets a trainee account with no dashboard access. Enforced server-side, not just in this UI.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Invite a coach</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="coach@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Note (optional)</Label>
              <Input placeholder="e.g. name, why they're invited" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          {formError && <p className="text-xs text-danger">{formError}</p>}
          <button
            type="button"
            disabled={!email.trim() || submitting}
            onClick={() => void handleAdd()}
            className="flex items-center gap-1.5 h-10 w-fit px-4 rounded-lg bg-success text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> {submitting ? 'Adding...' : 'Add to allowlist'}
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-sm font-semibold">Allowed coach emails</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {error && <p className="text-xs text-danger mb-2">Could not load allowlist: {error}</p>}
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No coach invites yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {entries.map((e) => (
                <div key={e.email} className="flex items-center justify-between h-11 px-2 rounded-lg hover:bg-background">
                  <div>
                    <p className="text-sm text-foreground">{e.email}</p>
                    {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeEmail(e.email).then(() => toast('Removed from allowlist.'))}
                    className="text-muted-foreground hover:text-danger p-1.5 rounded-md hover:bg-surface"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
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

export default function SettingsPage() {
  const profile = useProfile();
  const [tab, setTab] = useState<TabId>('profile');

  return (
    <div className="p-6 flex gap-8 max-w-5xl mx-auto">
      <nav className="w-52 shrink-0 flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-1">
          Your account
        </span>
        {ACCOUNT_TABS.map((t) => (
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

        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 mt-3 mb-1">
          Client experience
        </span>
        {CLIENT_EXPERIENCE_TABS.map((t) => (
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

        {profile.is_platform_admin && (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 mt-3 mb-1">
              Platform admin
            </span>
            {PLATFORM_ADMIN_TABS.map((t) => (
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
          </>
        )}
      </nav>

      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <h1 className="text-lg font-bold text-foreground">
          {TABS.find((t) => t.id === tab)?.label}
        </h1>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'app' && <AppTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'onboarding' && <OnboardingScreensTab />}
        {tab === 'coach-access' && profile.is_platform_admin && <CoachAccessTab />}
      </div>
    </div>
  );
}
