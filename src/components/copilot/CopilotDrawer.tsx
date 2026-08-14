import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowUp, BarChart3, ClipboardCheck, Dumbbell, Loader2, Plus, UserPlus, Users } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/shadcn/sheet';
import { ScrollArea } from '@/components/ui/shadcn/scroll-area';
import { useAiChat } from '@/hooks/useAiChat';

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

export default function CopilotDrawer({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}) {
  const { messages, send, startNewConversation, isReady, isThinking, error } = useAiChat(userId);
  const [prompt, setPrompt] = useState('');

  const time = useMemo(() => greeting(), []);

  const handleSend = (text = prompt) => {
    const value = text.trim();
    if (!value || isThinking || !isReady) return;
    setPrompt('');
    void send(value);
  };

  const newConversation = () => {
    void startNewConversation();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">TRACE Brain</span>
          <button
            onClick={newConversation}
            aria-label="New conversation"
            title="New conversation"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col px-4 py-4">
          {!isReady ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
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

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background border border-border rounded-xl px-3 py-2">
                <AlertTriangle size={13} className="text-warning shrink-0" />
                TRACE Brain's research pipeline isn't fully configured yet — replies are placeholders until it is.
              </div>

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
                      className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                        m.sender === 'USER'
                          ? 'self-end bg-primary text-primary-foreground'
                          : 'self-start bg-background border border-border text-foreground'
                      }`}
                    >
                      {m.content}
                    </motion.div>
                  ))}
                  {isThinking && (
                    <div className="self-start flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                      <Loader2 size={12} className="animate-spin" /> Thinking...
                    </div>
                  )}
                </div>
              </AnimatePresence>
            </ScrollArea>
          )}
          {error && <p className="text-xs text-danger mt-2">{error}</p>}
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
              disabled={!isReady}
              placeholder="Ask TRACE Brain about your roster..."
              className="w-full bg-transparent px-2 pt-1 text-sm text-foreground placeholder-muted-foreground outline-none disabled:opacity-50"
            />
            <div className="flex items-center justify-end">
              <button
                onClick={() => handleSend()}
                disabled={!isReady || isThinking || !prompt.trim()}
                aria-label="Send"
                className="w-8 h-8 rounded-full bg-primary hover:opacity-90 disabled:opacity-40 text-primary-foreground flex items-center justify-center transition-opacity"
              >
                {isThinking ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
