import { useState } from 'react';
import { ArrowUpDown, Download, Link2, Mail, Plus, Search, Settings2, Tag, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/shadcn/dialog';
import { Input, Select } from '@/components/ui/shadcn/field';

const columns = ['Client', 'Status', 'Tags', 'Attention', 'Last activity', 'Added'];
const statusOptions = ['Active', 'Trial', 'Archived', 'Deactivated'];

function InviteClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = useState<'email' | 'link' | 'find'>('email');
  const [email, setEmail] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Clients</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-background p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-colors ${tab === 'email' ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Mail size={14} /> Email
          </button>
          <button
            type="button"
            onClick={() => setTab('link')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-colors ${tab === 'link' ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Link2 size={14} /> Share Link
          </button>
          <button
            type="button"
            onClick={() => setTab('find')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-colors ${tab === 'find' ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Search size={14} /> Find User
          </button>
        </div>

        {tab === 'email' && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">Client Email</label>
            <Input
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Send an email invitation with a link to download the mobile app.
            </p>
            <DialogFooter>
              <button
                type="button"
                disabled={!email.trim()}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-foreground text-background disabled:opacity-40 text-sm font-semibold"
              >
                <Mail size={14} /> Send Email Invitation
              </button>
            </DialogFooter>
          </div>
        )}

        {tab === 'link' && (
          <p className="text-xs text-muted-foreground">
            Generate a shareable invite link clients can use to join your roster.
          </p>
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [filter, setFilter] = useState('');

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter clients..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-56"
        />

        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusOpen((o) => !o)}
            className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-surface transition-colors"
          >
            <Plus size={14} /> Status
          </button>
          {statusOpen && (
            <div className="absolute z-10 mt-1 w-48 rounded-lg border border-border bg-popover shadow-md p-1">
              {statusOptions.map((s) => (
                <label key={s} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer">
                  <input type="checkbox" className="accent-primary" />
                  {s}
                </label>
              ))}
            </div>
          )}
        </div>

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

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground">
          {columns.map((c) => (
            <span key={c} className="flex items-center gap-1">
              {c} <ArrowUpDown size={12} />
            </span>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
          <Users size={32} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No clients yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">Invite your first client to start coaching them in Tracked.</p>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity mt-1"
          >
            <UserPlus size={14} /> Invite Client
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>0 of 0 row(s) selected.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              Rows per page
              <Select className="h-7 w-16 px-2" defaultValue="20">
                <option value="20">20</option>
                <option value="50">50</option>
              </Select>
            </span>
            <span>Page 1 of 0</span>
          </div>
        </div>
      </div>

      <InviteClientDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <TagsDialog open={tagsOpen} onOpenChange={setTagsOpen} />
    </div>
  );
}
