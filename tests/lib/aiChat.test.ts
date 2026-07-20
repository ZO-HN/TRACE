import { describe, expect, it } from 'vitest';
import { appendMessage, type AiMessage } from '../../src/lib/chat/aiTypes';

const mk = (over: Partial<AiMessage>): AiMessage => ({
  id: 'm1',
  session_id: 's1',
  sender: 'USER',
  content: 'hi',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('appendMessage', () => {
  it('keeps ascending created_at order', () => {
    const list = [mk({ id: 'm2', created_at: '2026-01-01T00:02:00.000Z' })];
    const merged = appendMessage(list, mk({ id: 'm1', created_at: '2026-01-01T00:01:00.000Z' }));
    expect(merged.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('drops duplicate ids', () => {
    const list = [mk({ id: 'm1' })];
    expect(appendMessage(list, mk({ id: 'm1' }))).toHaveLength(1);
  });

  it('interleaves USER and ASSISTANT turns by time', () => {
    let list: AiMessage[] = [];
    list = appendMessage(list, mk({ id: 'u1', sender: 'USER', created_at: '2026-01-01T00:00:01.000Z' }));
    list = appendMessage(list, mk({ id: 'a1', sender: 'ASSISTANT', created_at: '2026-01-01T00:00:02.000Z' }));
    expect(list.map((m) => m.sender)).toEqual(['USER', 'ASSISTANT']);
  });
});
