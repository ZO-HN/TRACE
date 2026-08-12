import { useState } from 'react';
import { ArrowUpDown, Check, Copy, Download, Link2, Plus, Search, Settings2, Tag, UserMinus, UserPlus, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/shadcn/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/shadcn/popover';
import { Input, Select } from '@/components/ui/shadcn/field';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { useProfile } from '@/components/layout/AppShell';
import { useClients } from '@/hooks/useClients';
import { buildInviteLink, DEFAULT_ONBOARDING_SCREENS } from '@/config/onboardingScreens';

const columns = ['Client', 'Email', 'Added', 'Status'];
const statusOptions = ['Active', 'Trial', 'Archived', 'Deactivated'];

function StatusFilter() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<string[]>([]);

  const toggle = (s: string) =>
    setChecked((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const filtered = statusOptions.filter((s) => s.toLowerCase().includes(query.toLowerCase()));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors"
        >
          <Plus size={14} /> Status
          {checked.length > 0 && (
            <span className="ml-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold px-1.5">
              {checked.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 p-0"
        onEscapeKeyDown={() => {
          setChecked([]);
          setQuery('');
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Status"
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
          />
        </div>
        <div className="p-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No matches.</p>
          ) : (
            filtered.map((s) => (
              <label
                key={s}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={checked.includes(s)}
                  onChange={() => toggle(s)}
                />
                {s}
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InviteClientDialog({
  open,
  onOpenChange,
  coachName,
  coachCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachName: string;
  coachCode: string | null;
}) {
  const [tab, setTab] = useState<'link' | 'code' | 'find'>('link');
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const inviteLink = buildInviteLink(DEFAULT_ONBOARDING_SCREENS, coachName);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this invite link:', inviteLink);
    }
  };

  const copyCode = async () => {
    if (!coachCode) return;
    try {
      await navigator.clipboard.writeText(coachCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      window.prompt('Copy your referral code:', coachCode);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Clients</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-background p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab('link')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-colors ${tab === 'link' ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Link2 size={14} /> Share Link
          </button>
          <button
            type="button"
            onClick={() => setTab('code')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-colors ${tab === 'code' ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Tag size={14} /> Referral Code
          </button>
          <button
            type="button"
            onClick={() => setTab('find')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-colors ${tab === 'find' ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Search size={14} /> Find User
          </button>
        </div>

        {tab === 'link' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Share this link with a new client — it opens the onboarding form configured in Settings → Client onboarding screens.
              It doesn't create their TRACE account — they still sign up in the app separately.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteLink} className="text-xs" />
              <button
                type="button"
                onClick={() => void copyLink()}
                className="flex items-center gap-1.5 h-10 px-3 rounded-lg bg-foreground text-background text-sm font-semibold shrink-0"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {tab === 'code' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              After signing up in the TRACE app, a new client is asked to choose a coach. Have them enter this code
              on that screen to link to you directly, instead of browsing the coach list.
            </p>
            {coachCode ? (
              <div className="flex items-center gap-2">
                <Input readOnly value={coachCode} className="text-xs font-mono tracking-widest" />
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="flex items-center gap-1.5 h-10 px-3 rounded-lg bg-foreground text-background text-sm font-semibold shrink-0"
                >
                  {codeCopied ? <Check size={14} /> : <Copy size={14} />} {codeCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No referral code yet — refresh the page.</p>
            )}
          </div>
        )}

        {tab === 'find' && (
          <div className="flex flex-col gap-2">
            <Input placeholder="Search by name or email..." />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TagsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');
  const colors = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#A855F7', '#6B7280'];
  const [color, setColor] = useState(colors[0]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>Group your roster with your own tags, then filter the client list by them.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input placeholder="New tag name" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            type="button"
            disabled={!name.trim()}
            className="h-10 px-4 rounded-lg bg-success text-white disabled:opacity-40 text-sm font-semibold"
          >
            Create
          </button>
        </div>

        <div className="flex gap-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full border-2 transition-transform"
              style={{ backgroundColor: c, borderColor: color === c ? '#fff' : 'transparent' }}
            />
          ))}
        </div>

        <p className="text-sm text-muted-foreground text-center py-2">No tags yet — create your first one above.</p>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-sm font-semibold"
          >
            Done
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientsPage() {
  const profile = useProfile();
  const { clients, isLoading, error, setChurned } = useClients(profile.id);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = clients.filter((c) => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter clients..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-56"
        />

        <StatusFilter />

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setTagsOpen(true)}
          className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors"
        >
          <Tag size={14} /> Tags
        </button>
        <button className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors">
          <Download size={14} /> Export
        </button>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <UserPlus size={14} /> Invite Client
        </button>
        <button className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors">
          <Settings2 size={14} /> View
        </button>
      </div>

      {error && <p className="text-sm text-danger">Could not load clients: {error}</p>}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground">
          {columns.map((c) => (
            <span key={c} className="flex items-center gap-1">
              {c} <ArrowUpDown size={12} />
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
            <Users size={32} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">{clients.length === 0 ? 'No clients yet' : 'No clients match your filter'}</p>
            {clients.length === 0 && (
              <>
                <p className="text-xs text-muted-foreground max-w-xs">Invite your first client to start coaching them in TRACE.</p>
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center gap-2 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity mt-1"
                >
                  <UserPlus size={14} /> Invite Client
                </button>
              </>
            )}
          </div>
        ) : (
          filtered.map((c) => {
            const initials = `${c.first_name[0] ?? ''}${c.last_name[0] ?? ''}`.toUpperCase();
            return (
              <div key={c.id} className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-border last:border-b-0 items-center text-sm">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{initials || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {c.first_name} {c.last_name}
                  </span>
                </div>
                <span className="text-muted-foreground">{c.email}</span>
                <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.manually_marked_churned ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'}`}
                  >
                    {c.manually_marked_churned ? 'Churned' : 'Active'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void setChurned(c.id, !c.manually_marked_churned)}
                    title={c.manually_marked_churned ? 'Mark active' : 'Mark churned'}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background"
                  >
                    <UserMinus size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>{filtered.length} of {clients.length} row(s).</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              Rows per page
              <Select className="h-7 w-16 px-2" defaultValue="20">
                <option value="20">20</option>
                <option value="50">50</option>
              </Select>
            </span>
            <span>Page 1 of {Math.max(1, Math.ceil(filtered.length / 20))}</span>
          </div>
        </div>
      </div>

      <InviteClientDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        coachName={profile.first_name ?? ''}
        coachCode={profile.coach_code}
      />
      <TagsDialog open={tagsOpen} onOpenChange={setTagsOpen} />
    </div>
  );
}
