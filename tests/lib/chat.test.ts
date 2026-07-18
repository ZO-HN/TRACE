import { describe, expect, it } from 'vitest';
import { isBetween, mergeMessage, type DirectMessage } from '../../src/lib/chat/types';

const msg = (over: Partial<DirectMessage>): DirectMessage => ({
  id: 'm1',
  sender_id: 'a',
  recipient_id: 'b',
  content: 'hi',
  created_at: '2026-01-01T00:00:00.000Z',
  read_at: null,
  ...over,
});

describe('isBetween', () => {
  it('matches both directions of the pair', () => {
    expect(isBetween(msg({}), 'a', 'b')).toBe(true);
    expect(isBetween(msg({ sender_id: 'b', recipient_id: 'a' }), 'a', 'b')).toBe(true);
  });

  it('rejects messages from other conversations', () => {
    expect(isBetween(msg({ sender_id: 'c' }), 'a', 'b')).toBe(false);
  });
});

describe('mergeMessage', () => {
  it('keeps ascending created_at order', () => {
    const list = [msg({ id: 'm2', created_at: '2026-01-01T00:02:00.000Z' })];
    const merged = mergeMessage(list, msg({ id: 'm1', created_at: '2026-01-01T00:01:00.000Z' }));
    expect(merged.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('drops duplicates by id (realtime echo of own send)', () => {
    const list = [msg({ id: 'm1' })];
    expect(mergeMessage(list, msg({ id: 'm1' }))).toHaveLength(1);
  });
});
