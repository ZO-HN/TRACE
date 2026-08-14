import { useState } from 'react';
import { Bot } from 'lucide-react';
import CopilotDrawer from './CopilotDrawer';

export default function CopilotFab({ userId }: { userId: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="AI Copilot"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_24px_var(--accent)] hover:scale-105 transition-transform"
      >
        <Bot size={24} />
      </button>

      <CopilotDrawer open={drawerOpen} onOpenChange={setDrawerOpen} userId={userId} />
    </>
  );
}
