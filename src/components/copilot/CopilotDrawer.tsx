import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  BarChart3,
  Check,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  FastForward,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/shadcn/sheet';
import { ScrollArea } from '@/components/ui/shadcn/scroll-area';
import { Label, Input } from '@/components/ui/shadcn/field';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/shadcn/dropdown-menu';
import { useCopilotConnection } from '@/hooks/useCopilotConnection';

interface CopilotMessage {
  id: string;
  prompt: string;
  response: string;
  timestamp: string;
}

function mockRespond(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('assign') || lower.includes('plan')) {
    return 'Assigned "Hypertrophy Block A" to 3 active trainees on your roster and updated start dates.';
  }
  if (lower.includes('message') || lower.includes('send') || lower.includes('check')) {
    return 'Dispatched a check-in message to all trainees with missed workouts in the last 48 hours.';
  }
  if (lower.includes('risk') || lower.includes('injur')) {
    return 'Flagged 2 trainees showing elevated fatigue/injury-risk markers based on recent set logs.';
  }
  return `Executed: configured roster and reviewed context based on "${text}".`;
}

const AUTHORIZE_STEPS = [
  'Grab an API key from your AI provider’s dashboard.',
  'Paste it into the field below.',
  'Click Authorize to link it — it’s stored only in this browser for now.',
];

const SUGGESTIONS = [
  { icon: Users, title: 'Review roster', subtitle: 'See who needs attention', prompt: 'Review my roster and flag anyone at risk' },
  { icon: Dumbbell, title: 'Assign a program', subtitle: 'Build from a template', prompt: 'Assign Hypertrophy Block A to my beginners' },
  { icon: ClipboardCheck, title: 'Send check-ins', subtitle: 'Nudge inactive clients', prompt: 'Send a check-in to clients who missed sessions' },
  { icon: BarChart3, title: 'Weekly summary', subtitle: 'Highlights across your roster', prompt: 'Give me a weekly summary of my roster' },
  { icon: UserPlus, title: 'Find a client', subtitle: 'Look up profile & progress', prompt: 'Find a client by name' },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function ConfigureCard({ onAuthorize }: { onAuthorize: (apiKey: string) => void }) {
  const [apiKey, setApiKey] = useState('');

  return (
    <div className="bg-background border border-border rounded-xl p-4 flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <KeyRound size={14} className="text-primary" /> Configure Copilot
      </div>
      <p className="text-xs text-muted-foreground">
        Chat Copilot isn't connected yet. Follow these steps to authorize it:
      </p>
      <ol className="flex flex-col gap-1.5">
        {AUTHORIZE_STEPS.map((step, i) => (
          <li key={step} className="flex items-start gap-2 text-xs text-foreground">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0 mt-0.5">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">API key</Label>
        <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="h-9 text-sm" />
      </div>
      <button
        type="button"
        disabled={!apiKey.trim()}
        onClick={() => onAuthorize(apiKey)}
        className="h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        Authorize
      </button>
    </div>
  );
}

export default function CopilotDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isConnected, connect } = useCopilotConnection();
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [justAuthorized, setJustAuthorized] = useState(false);
  const [editMode, setEditMode] = useState<'ask' | 'auto'>('ask');
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [conversationSearch, setConversationSearch] = useState('');

  const time = useMemo(() => greeting(), []);

  const handleSend = (text = prompt) => {
    const value = text.trim();
    if (!value || isProcessing || !isConnected) return;

    setIsProcessing(true);
    setTimeout(() => {
      setMessages((prev) => [
        {
          id: Date.now().toString(),
          prompt: value,
          response: mockRespond(value),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      setIsProcessing(false);
      setPrompt('');
    }, 600);
  };

  const handleAuthorize = (apiKey: string) => {
    connect(apiKey);
    setJustAuthorized(true);
  };

  const newConversation = () => {
    setMessages([]);
    setJustAuthorized(false);
    setConversationMenuOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <DropdownMenu open={conversationMenuOpen} onOpenChange={setConversationMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                New conversation <ChevronDown size={14} className="text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2">
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-8 pl-7 pr-2 rounded-md bg-background border border-border text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground px-1 pb-2">No conversations yet</p>
              <button
                onClick={newConversation}
                className="flex items-center justify-center gap-1.5 w-full h-8 rounded-md border border-border text-xs font-medium text-foreground hover:bg-surface transition-colors"
              >
                <Plus size={12} /> New conversation
              </button>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1 mr-6">
            <button
              onClick={newConversation}
              aria-label="New conversation"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col px-4 py-4">
          {!isConnected ? (
            <div className="flex-1 flex items-center justify-center">
              <ConfigureCard onAuthorize={handleAuthorize} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
              <div
                className="w-32 h-24 rounded-full blur-xl opacity-80"
                style={{
                  background:
                    'radial-gradient(circle at 30% 40%, var(--accent), transparent 60%), radial-gradient(circle at 65% 55%, #8b7ffb, transparent 55%), radial-gradient(circle at 50% 70%, #4f46e5, transparent 60%)',
                }}
              />
              <div>
                <p className="text-lg font-semibold text-foreground">{time}.</p>
                <p className="text-sm text-muted-foreground">What are we doing today?</p>
              </div>

              {justAuthorized && (
                <div className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/30 rounded-xl px-3 py-2">
                  <Check size={14} /> Copilot authorized — you're ready to chat.
                </div>
              )}

              <div className="flex flex-col gap-2 w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => handleSend(s.prompt)}
                    className="flex items-center gap-3 text-left rounded-xl border border-border bg-background px-3.5 py-3 hover:border-primary/40 hover:bg-surface transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <s.icon size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0 -mx-1 px-1">
              <AnimatePresence initial={false}>
                <div className="flex flex-col gap-2 pb-2">
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-background border border-border rounded-xl p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-medium text-primary">"{m.prompt}"</span>
                        <span>{m.timestamp}</span>
                      </div>
                      <p className="text-foreground">{m.response}</p>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </ScrollArea>
          )}
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-border bg-background p-2 flex flex-col gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              disabled={!isConnected}
              placeholder={isConnected ? 'Ask Copilot about your roster...' : 'Authorize Copilot above to start chatting'}
              className="w-full bg-transparent px-2 pt-1 text-sm text-foreground placeholder-muted-foreground outline-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border text-xs font-medium text-muted-foreground">
                <Pencil size={11} /> Ask
              </span>

              <div className="flex items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="Edit mode"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                    >
                      <SlidersHorizontal size={15} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Edit mode</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setEditMode('ask')}>
                      <Pencil size={13} className={editMode === 'ask' ? 'text-primary' : ''} />
                      <div>
                        <p className="text-sm">Ask before editing</p>
                        <p className="text-xs text-muted-foreground">Review and approve each change</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditMode('auto')}>
                      <FastForward size={13} className={editMode === 'auto' ? 'text-primary' : ''} />
                      <div>
                        <p className="text-sm">Automatically edit</p>
                        <p className="text-xs text-muted-foreground">Always allow edits for this conversation</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  onClick={() => handleSend()}
                  disabled={!isConnected || isProcessing || !prompt.trim()}
                  aria-label="Send"
                  className="w-8 h-8 rounded-full bg-primary hover:opacity-90 disabled:opacity-40 text-primary-foreground flex items-center justify-center transition-opacity"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
