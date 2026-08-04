import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import CopilotDrawer from './CopilotDrawer';

export default function CopilotFab({ userId: _userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI Copilot"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_24px_var(--accent)] hover:scale-105 transition-transform"
      >
        <Sparkles size={22} />
      </button>
      <CopilotDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
