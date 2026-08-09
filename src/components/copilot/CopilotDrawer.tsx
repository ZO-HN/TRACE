import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, Zap } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { ScrollArea } from '@/components/ui/shadcn/scroll-area';

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

export default function CopilotDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);

  const handleSend = () => {
    const text = prompt.trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setTimeout(() => {
      setMessages((prev) => [
        {
          id: Date.now().toString(),
          prompt: text,
          response: mockRespond(text),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      setIsProcessing(false);
      setPrompt('');
    }, 600);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            AI Copilot
          </SheetTitle>
          <SheetDescription>
            Ask anything — assign plans, send check-ins, or query your roster in natural language. Responses here are
            simulated for now; no request leaves your browser.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-5 flex-1 min-h-0">
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="e.g. Assign Hypertrophy Block A to all beginners"
              className="flex-1 h-10 bg-background border border-border rounded-xl px-3 text-sm text-foreground placeholder-muted-foreground focus:border-primary outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={isProcessing || !prompt.trim()}
              className="h-10 px-3.5 bg-primary hover:opacity-90 disabled:opacity-40 text-primary-foreground rounded-xl text-sm font-semibold transition-opacity flex items-center gap-1.5"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            </button>
          </div>

          <ScrollArea className="flex-1 min-h-0 -mx-1 px-1">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No messages yet — try asking the copilot to do something.
              </p>
            ) : (
              <AnimatePresence initial={false}>
                <div className="flex flex-col gap-2 pb-4">
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
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
