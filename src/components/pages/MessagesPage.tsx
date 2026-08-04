import { useState } from 'react';
import { Plus, Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/shadcn/field';

const filters = ['All', 'Clients', 'Friends', 'Groups'] as const;

export default function MessagesPage() {
  const [tab, setTab] = useState<(typeof filters)[number]>('All');

  return (
    <div className="flex h-[calc(100vh-57px)]">
      <div className="w-80 shrink-0 border-r border-border flex flex-col p-4 gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="pl-8" />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTab(f)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                tab === f ? 'bg-success/15 text-success border-success/40' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
          <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
            <Plus size={18} />
          </button>
          <p className="text-sm font-semibold text-foreground">No conversations yet</p>
          <p className="text-xs text-muted-foreground">Start a new conversation to get started</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <UserPlus size={26} className="text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold text-foreground">Invite a client to start messaging</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don't have any clients yet. Once you invite someone, you can message them right from here.
        </p>
        <button className="h-10 px-5 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity mt-1">
          Invite a client
        </button>
      </div>
    </div>
  );
}
