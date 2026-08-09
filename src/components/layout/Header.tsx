import { useState } from 'react';
import { Search, MessageCircleQuestion, Bell, LogOut, Activity, Settings, LifeBuoy, Send } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { Textarea, Input } from '@/components/ui/shadcn/field';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/shadcn/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import { useFeedback } from '@/hooks/useFeedback';
import { useToast } from '@/components/ui/toast';
import type { TraceProfile } from '@/hooks/useTraceUser';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationsMenu({ coachId }: { coachId: string }) {
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications(coachId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-background"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button onClick={() => void markAllRead()} className="text-xs font-medium text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => !n.read && void markRead(n.id)}
                className="flex-col items-start gap-0.5 py-2.5"
              >
                <div className="flex items-center gap-2 w-full">
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  <span className={n.read ? 'text-sm text-muted-foreground' : 'text-sm font-semibold text-foreground'}>
                    {n.title}
                  </span>
                </div>
                {n.body && <p className="text-xs text-muted-foreground pl-3.5">{n.body}</p>}
                <span className="text-[10px] text-muted-foreground pl-3.5">{timeAgo(n.created_at)}</span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FeedbackMenu({ coachId }: { coachId: string }) {
  const { submit, isSubmitting } = useFeedback(coachId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!message.trim()) return;
    const { error } = await submit(topic, message);
    if (error) {
      toast(`Could not send feedback: ${error}`);
      return;
    }
    toast('Feedback sent. Thank you!');
    setTopic('');
    setMessage('');
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors">
          <MessageCircleQuestion size={14} />
          Feedback
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-3">
        <DropdownMenuLabel className="p-0 mb-2">Send feedback</DropdownMenuLabel>
        <div className="flex flex-col gap-2">
          <Input placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="h-9 text-sm" />
          <Textarea
            placeholder="Your feedback..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-24 text-sm"
          />
          <button
            type="button"
            disabled={!message.trim() || isSubmitting}
            onClick={() => void handleSend()}
            className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-success text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send size={13} /> {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Header({ profile, title }: { profile: TraceProfile | null; title: string }) {
  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase();
  const navigate = useNavigate();

  return (
    <header className="bg-surface border-b border-border py-3 px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Activity size={16} className="text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">TRACE</span>
        </div>

        <div className="w-px h-6 bg-border shrink-0" />

        <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-lg bg-background border border-border text-sm text-muted-foreground w-56">
          <Search size={14} />
          <span className="flex-1">Search...</span>
          <kbd className="text-[10px] border border-border rounded px-1 py-0.5">⌘K</kbd>
        </div>

        {profile && <FeedbackMenu coachId={profile.id} />}
        {profile && <NotificationsMenu coachId={profile.id} />}

        <div className="w-px h-6 bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Avatar>
                <AvatarFallback>{initials || '?'}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings size={14} /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LifeBuoy size={14} /> Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void supabase.auth.signOut()}>
              <LogOut size={14} /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
