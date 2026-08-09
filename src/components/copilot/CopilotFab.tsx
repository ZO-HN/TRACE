import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useCopilotConnection } from '@/hooks/useCopilotConnection';
import CopilotDrawer from './CopilotDrawer';

export default function CopilotFab({ userId: _userId }: { userId: string }) {
  const { isConnected } = useCopilotConnection();
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
        {!isConnected && (
          <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-warning border-2 border-background" />
        )}
      </button>

      <CopilotDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
