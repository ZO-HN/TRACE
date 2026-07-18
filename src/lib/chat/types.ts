// Direct (human-to-human) chat types + pure conversation helpers.

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

/** True when the message belongs to the conversation between a and b. */
export function isBetween(msg: DirectMessage, a: string, b: string): boolean {
  return (
    (msg.sender_id === a && msg.recipient_id === b) ||
    (msg.sender_id === b && msg.recipient_id === a)
  );
}

/** Insert msg keeping ascending created_at order and dropping duplicates by id. */
export function mergeMessage(
  list: DirectMessage[],
  msg: DirectMessage,
): DirectMessage[] {
  if (list.some((m) => m.id === msg.id)) return list;
  return [...list, msg].sort((x, y) => x.created_at.localeCompare(y.created_at));
}
