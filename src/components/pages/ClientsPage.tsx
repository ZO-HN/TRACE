import { useMemo, useState } from 'react';
import { ArrowUpDown, Check, Copy, Download, Link2, Plus, Search, Settings2, Tag, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
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
import { useClientTags, type ClientTag } from '@/hooks/useClientTags';
import { useCheckIns } from '@/hooks/useCheckIns';
import { useFormChecks } from '@/hooks/useFormChecks';
import { useCoachRoster } from '@/hooks/useCoachRoster';
import { buildServerInviteUrl } from '@/config/onboardingScreens';
import { useInviteLink } from '@/hooks/useInviteLink';
import { useToast } from '@/components/ui/toast';

const statusOptions = ['Active', 'Trial', 'Archived', 'Deactivated'];

type ColumnKey = 'status' | 'tags' | 'attention' | 'lastActivity' | 'createdAt' | 'monthlyValue';

const TOGGLE_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'tags', label: 'Tags' },
  { key: 'attention', label: 'Attention' },
  { key: 'lastActivity', label: 'Last Activity' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'monthlyValue', label: 'Monthly Value' },
];

// Monthly Value has nowhere to read from — this app has no billing/payments
// table anywhere in the schema. Included in the toggle menu (matches the
// intended design) but always renders "—" rather than a fabricated number;
// off by default for the same reason.
const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = ['status', 'tags', 'attention', 'lastActivity', 'createdAt'];

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ViewMenu({ visible, onToggle }: { visible: Set<ColumnKey>; onToggle: (key: ColumnKey) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors"
        >
          <Settings2 size={14} /> View
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1.5">
          Toggle columns
        </p>
        {TOGGLE_COLUMNS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onToggle(c.key)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors"
          >
            <span className={`w-4 shrink-0 ${visible.has(c.key) ? 'text-primary' : 'text-transparent'}`}>
              <Check size={14} />
            </span>
            {c.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

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
  coachId,
  coachCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  coachCode: string | null;
}) {
  const [tab, setTab] = useState<'link' | 'code' | 'find'>('link');
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const { invite, isLoading: inviteLoading } = useInviteLink(coachId);
  const inviteLink = invite ? buildServerInviteUrl(invite.id) : null;

  const copyLink = async () => {
    if (!inviteLink) return;
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
            {inviteLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : inviteLink ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Share this link with a new client — it opens the onboarding form configured in Settings → Client
                  onboarding screens. It doesn't create their TRACE account — they still sign up in the app
                  separately.
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
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No active invite link yet — generate one in Settings → Client onboarding screens.
              </p>
            )}
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

function TagAssignPopover({
  clientId,
  tags,
  assignedTags,
  assignTag,
  unassignTag,
}: {
  clientId: string;
  tags: ClientTag[];
  assignedTags: ClientTag[];
  assignTag: (clientId: string, tagId: string) => Promise<{ error: string | null }>;
  unassignTag: (clientId: string, tagId: string) => Promise<{ error: string | null }>;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const assignedIds = new Set(assignedTags.map((t) => t.id));

  const toggle = async (tagId: string, isAssigned: boolean) => {
    setPendingId(tagId);
    await (isAssigned ? unassignTag(clientId, tagId) : assignTag(clientId, tagId));
    setPendingId(null);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
        >
          <Plus size={11} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2 px-2">No tags yet — create one first.</p>
        ) : (
          tags.map((t) => {
            const isAssigned = assignedIds.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                disabled={pendingId === t.id}
                onClick={() => void toggle(t.id, isAssigned)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <span className={`w-4 shrink-0 ${isAssigned ? 'text-primary' : 'text-transparent'}`}>
                  <Check size={14} />
                </span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                {t.name}
              </button>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
}

function TagsDialog({
  open,
  onOpenChange,
  coachId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
}) {
  const { tags, isLoading, error, createTag, deleteTag } = useClientTags(coachId);
  const { toast } = useToast();
  const [name, setName] = useState('');
  const colors = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#A855F7', '#6B7280'];
  const [color, setColor] = useState(colors[0]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    const { error: err } = await createTag(name, color);
    setCreating(false);
    if (err) {
      setCreateError(err);
      return;
    }
    setName('');
    toast('Tag created.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>Group your roster with your own tags, then filter the client list by them.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="New tag name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
          />
          <button
            type="button"
            disabled={!name.trim() || creating}
            onClick={() => void handleCreate()}
            className="h-10 px-4 rounded-lg bg-success text-white disabled:opacity-40 text-sm font-semibold"
          >
            {creating ? 'Creating...' : 'Create'}
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

        {createError && <p className="text-xs text-danger">{createError}</p>}
        {error && <p className="text-xs text-danger">Could not load tags: {error}</p>}

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-2">Loading...</p>
        ) : tags.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">No tags yet — create your first one above.</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {tags.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted">
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </span>
                <button
                  type="button"
                  onClick={() => void deleteTag(t.id)}
                  className="text-muted-foreground hover:text-danger p-1 rounded-md"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

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
  const { tags, assignmentsByClient, assignTag, unassignTag } = useClientTags(profile.id);
  const { needsReview } = useCheckIns(profile.id);
  const { formChecks } = useFormChecks(profile.id);
  const { roster } = useCoachRoster(profile.id);
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_VISIBLE_COLUMNS));

  const toggleColumn = (key: ColumnKey) =>
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const filtered = clients.filter((c) => `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(filter.toLowerCase()));

  const attentionByClient = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of needsReview) m.set(r.client_id, (m.get(r.client_id) ?? 0) + 1);
    for (const f of formChecks) if (f.status === 'unreviewed') m.set(f.client_id, (m.get(f.client_id) ?? 0) + 1);
    return m;
  }, [needsReview, formChecks]);

  const lastActivityByClient = useMemo(() => new Map(roster.map((r) => [r.trainee_id, r.latest_biometric_date])), [roster]);

  const activeColumns = TOGGLE_COLUMNS.filter((c) => visibleColumns.has(c.key));
  const gridStyle = { gridTemplateColumns: `repeat(${2 + activeColumns.length}, minmax(0,1fr))` };

  const handleExport = () => {
    const rows = [
      ['Name', 'Email', 'Added', 'Status'],
      ...filtered.map((c) => [
        `${c.first_name} ${c.last_name}`,
        c.email,
        new Date(c.created_at).toLocaleDateString(),
        c.manually_marked_churned ? 'Churned' : 'Active',
      ]),
    ];
    downloadCsv(`clients-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast(`Exported ${filtered.length} client${filtered.length === 1 ? '' : 's'}.`);
  };

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
        <button
          type="button"
          disabled={filtered.length === 0}
          onClick={handleExport}
          className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors disabled:opacity-40"
        >
          <Download size={14} /> Export
        </button>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <UserPlus size={14} /> Invite Client
        </button>
        <ViewMenu visible={visibleColumns} onToggle={toggleColumn} />
      </div>

      {error && <p className="text-sm text-danger">Could not load clients: {error}</p>}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid gap-4 px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground" style={gridStyle}>
          <span className="flex items-center gap-1">Client <ArrowUpDown size={12} /></span>
          <span className="flex items-center gap-1">Email <ArrowUpDown size={12} /></span>
          {activeColumns.map((c) => (
            <span key={c.key} className="flex items-center gap-1">
              {c.label} <ArrowUpDown size={12} />
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
            const clientTags: ClientTag[] = assignmentsByClient.get(c.id) ?? [];
            const attentionCount = attentionByClient.get(c.id) ?? 0;
            const lastActivity = lastActivityByClient.get(c.id);
            return (
              <div key={c.id} className="grid gap-4 px-4 py-3 border-b border-border last:border-b-0 items-center text-sm" style={gridStyle}>
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{initials || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {c.first_name} {c.last_name}
                  </span>
                </div>
                <span className="text-muted-foreground">{c.email}</span>
                {visibleColumns.has('status') && (
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
                )}
                {visibleColumns.has('tags') && (
                  <div className="flex flex-wrap items-center gap-1">
                    {clientTags.map((t) => (
                      <span
                        key={t.id}
                        className="flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${t.color}26`, color: t.color }}
                      >
                        {t.name}
                      </span>
                    ))}
                    <TagAssignPopover
                      clientId={c.id}
                      tags={tags}
                      assignedTags={clientTags}
                      assignTag={assignTag}
                      unassignTag={unassignTag}
                    />
                  </div>
                )}
                {visibleColumns.has('attention') &&
                  (attentionCount > 0 ? (
                    <span className="text-xs font-semibold text-warning w-fit px-2 py-0.5 rounded-full bg-warning/15">
                      {attentionCount} awaiting review
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ))}
                {visibleColumns.has('lastActivity') && (
                  <span className="text-muted-foreground">{lastActivity ? new Date(lastActivity).toLocaleDateString() : '—'}</span>
                )}
                {visibleColumns.has('createdAt') && (
                  <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                )}
                {visibleColumns.has('monthlyValue') && <span className="text-muted-foreground">—</span>}
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
        coachId={profile.id}
        coachCode={profile.coach_code}
      />
      <TagsDialog open={tagsOpen} onOpenChange={setTagsOpen} coachId={profile.id} />
    </div>
  );
}
