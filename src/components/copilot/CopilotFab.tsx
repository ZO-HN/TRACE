import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bot, Check, KeyRound, MessageSquare, Settings2, ShieldAlert } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/shadcn/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/shadcn/dialog';
import { Label, Input } from '@/components/ui/shadcn/field';
import { useCopilotConnection } from '@/hooks/useCopilotConnection';
import CopilotDrawer from './CopilotDrawer';

export default function CopilotFab({ userId: _userId }: { userId: string }) {
  const navigate = useNavigate();
  const { isConnected, connect, disconnect } = useCopilotConnection();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authorizeOpen, setAuthorizeOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const handleAuthorize = () => {
    connect(apiKey);
    setApiKey('');
    setAuthorizeOpen(false);
    setDrawerOpen(true);
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="AI Copilot"
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_24px_var(--accent)] hover:scale-105 transition-transform"
          >
            <Bot size={24} />
            {!isConnected && (
              <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-warning border-2 border-background" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="top" className="w-72">
          {isConnected ? (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-foreground text-sm font-semibold">
                <Check size={14} className="text-success" /> API token active
              </DropdownMenuLabel>
              <p className="px-2 pb-2 text-xs text-muted-foreground">Copilot can access your coach data.</p>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDrawerOpen(true)}>
                <MessageSquare size={14} /> Open chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings2 size={14} /> Configure permissions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={disconnect} className="text-danger focus:text-danger">
                Disconnect
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-foreground text-sm font-semibold">
                <ShieldAlert size={14} className="text-warning" /> API not connected
              </DropdownMenuLabel>
              <p className="px-2 pb-2 text-xs text-muted-foreground">
                Chat Copilot isn't available yet — authorize an API key to enable it.
              </p>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  setAuthorizeOpen(true);
                }}
              >
                <KeyRound size={14} /> Authorize
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={authorizeOpen} onOpenChange={setAuthorizeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Authorize Copilot</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Paste your AI provider API key to link it for the first time. This is stored only in this browser for now —
            it isn't sent to or saved on the TRACE backend yet.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label>API key</Label>
            <Input
              type="password"
              autoFocus
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAuthorizeOpen(false)}
              className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!apiKey.trim()}
              onClick={handleAuthorize}
              className="h-10 px-4 rounded-lg bg-success text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Authorize
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CopilotDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
