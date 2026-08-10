import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/shadcn/field';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { useProfile } from '@/components/layout/AppShell';
import { useClients } from '@/hooks/useClients';
import ChatPanel from '@/components/chat/ChatPanel';

export default function MessagesPage() {
  const profile = useProfile();
  const navigate = useNavigate();
  const { clients, isLoading } = useClients(profile.id);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = clients.filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(query.toLowerCase()));
  const selected = clients.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-57px)]">
      <div className="w-80 shrink-0 border-r border-border flex flex-col p-4 gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search clients..." className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-8">Loading...</p>
        ) : clients.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
            <p className="text-sm font-semibold text-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground">Invite a client to start messaging</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-1">
            {filtered.map((c) => {
              const initials = `${c.first_name[0] ?? ''}${c.last_name[0] ?? ''}`.toUpperCase();
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                    selectedId === c.id ? 'bg-primary/10' : 'hover:bg-surface',
                  )}
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{initials || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground truncate">
                    {c.first_name} {c.last_name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {selected ? (
          <div className="flex-1 p-4">
            <ChatPanel myId={profile.id} peerId={selected.id} peerLabel={`${selected.first_name} ${selected.last_name}`} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <UserPlus size={26} className="text-muted-foreground" />
            </div>
            {clients.length === 0 ? (
              <>
                <p className="text-lg font-semibold text-foreground">Invite a client to start messaging</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  You don't have any clients yet. Once you invite someone, you can message them right from here.
                </p>
                <button
                  onClick={() => navigate('/settings')}
                  className="h-10 px-5 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity mt-1"
                >
                  Invite a client
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a client to start messaging</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
