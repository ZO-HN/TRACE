// TRACE Brain (AI assistant) chat types + pure helpers.

export type ChatSender = 'USER' | 'ASSISTANT';

export interface AiMessage {
  id: string;
  session_id: string;
  sender: ChatSender;
  content: string;
  created_at: string;
}

/** Append keeping ascending created_at and dropping duplicates by id. */
export function appendMessage(list: AiMessage[], msg: AiMessage): AiMessage[] {
  if (list.some((m) => m.id === msg.id)) return list;
  return [...list, msg].sort((a, b) => a.created_at.localeCompare(b.created_at));
}
