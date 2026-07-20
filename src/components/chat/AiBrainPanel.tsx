// TRACE Brain assistant panel — grounded training/injury Q&A (RAG pipeline
// lives in the trace-brain edge function; this is the client surface).

import { useState } from 'react';
import { useAiChat } from '../../hooks/useAiChat';

export default function AiBrainPanel({ userId }: { userId: string }) {
  const { messages, send, isThinking, error } = useAiChat(userId);
  const [draft, setDraft] = useState('');

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isThinking) return;
    setDraft('');
    await send(text);
  };

  return (
    <div className="bg-surface border border-border rounded-xl flex flex-col max-h-96">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" />
        <h3 className="text-sm font-semibold text-white">TRACE Brain</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[9rem]">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-6">
            Ask about training, recovery, or an injury flare.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.sender === 'USER'
                ? 'ml-auto bg-primary text-white'
                : 'mr-auto bg-background border border-border text-gray-200'
            }`}
          >
            {m.content}
          </div>
        ))}
        {isThinking && (
          <div className="mr-auto bg-background border border-border text-gray-500 rounded-xl px-3 py-2 text-sm">
            Thinking...
          </div>
        )}
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
          placeholder="Ask TRACE Brain..."
          className="flex-1 h-10 bg-background border border-border rounded-lg px-3 text-sm text-gray-100 focus:border-primary outline-none"
        />
        <button
          onClick={() => void handleSend()}
          disabled={isThinking || !draft.trim()}
          className="h-10 px-4 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Ask
        </button>
      </div>
    </div>
  );
}
