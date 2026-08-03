// Minimal 1-on-1 chat panel (coached trainee <-> coach).

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { useDirectChat } from '../../hooks/useDirectChat';
import Button from '../ui/Button';

export interface ChatPanelProps {
  myId: string;
  peerId: string;
  peerLabel: string;
}

export default function ChatPanel({ myId, peerId, peerLabel }: ChatPanelProps) {
  const { messages, send, error } = useDirectChat(myId, peerId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await send(draft);
      setDraft('');
    } catch {
      // error state is surfaced below; keep the draft for retry
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-background border border-border rounded-2xl flex flex-col max-h-80">
      <div className="px-4 py-2.5 border-b border-border">
        <h3 className="text-sm font-semibold text-white">{peerLabel}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[8rem]">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">No messages yet.</p>
        )}
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.sender_id === myId
                ? 'ml-auto bg-primary text-white'
                : 'mr-auto bg-surface border border-border text-gray-200'
            }`}
          >
            {m.content}
          </motion.div>
        ))}
      </div>

      {error && (
        <p className="px-4 py-1 text-xs text-red-400 border-t border-border">{error}</p>
      )}

      <div className="p-2 border-t border-border flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSend();
          }}
          placeholder="Message..."
          className="flex-1 h-10 bg-surface border border-border rounded-xl px-3 text-sm text-gray-100 focus:border-primary outline-none"
        />
        <Button
          size="sm"
          onClick={() => void handleSend()}
          disabled={!draft.trim()}
          loading={sending}
          icon={<Send size={14} />}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
