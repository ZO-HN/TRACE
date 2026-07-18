// Minimal 1-on-1 chat panel (coached trainee <-> coach).

import { useState } from 'react';
import { useDirectChat } from '../../hooks/useDirectChat';

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
    <div className="bg-surface border border-border rounded-xl flex flex-col max-h-80">
      <div className="px-4 py-2.5 border-b border-border">
        <h3 className="text-sm font-semibold text-white">{peerLabel}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[8rem]">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">No messages yet.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
              m.sender_id === myId
                ? 'ml-auto bg-primary text-white'
                : 'mr-auto bg-background border border-border text-gray-200'
            }`}
          >
            {m.content}
          </div>
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
          className="flex-1 h-10 bg-background border border-border rounded-lg px-3 text-sm text-gray-100 focus:border-primary outline-none"
        />
        <button
          onClick={() => void handleSend()}
          disabled={sending || !draft.trim()}
          className="h-10 px-4 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
