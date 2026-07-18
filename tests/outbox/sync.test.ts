import { describe, expect, it, vi } from 'vitest';
import { backoffMs, flushOutbox, type FlushDeps } from '../../src/lib/outbox/sync';
import type { OutboxItem, OutboxStatus } from '../../src/lib/outbox/types';

const mk = (
  id: string,
  status: OutboxStatus = 'pending',
  attempts = 0,
): OutboxItem => ({
  id,
  status,
  attempts,
  updated_at: '2026-01-01T00:00:00.000Z',
  payload: {
    id,
    session_id: 'session-1',
    exercise_id: 'exercise-1',
    set_number: 1,
    weight_kg: 100,
    reps: 5,
  },
});

function makeDeps(items: OutboxItem[], upsert: ReturnType<typeof vi.fn>) {
  const store = new Map(items.map((i) => [i.id, i] as const));
  const deps: FlushDeps = {
    supabase: { from: () => ({ upsert }) },
    getItems: async () => [...store.values()],
    saveItem: async (item) => {
      store.set(item.id, item);
    },
    now: () => '2026-01-01T00:00:00.000Z',
  };
  return { store, deps };
}

describe('flushOutbox', () => {
  it('syncs pending items and marks them synced', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const { store, deps } = makeDeps([mk('a'), mk('b')], upsert);

    const result = await flushOutbox(deps);

    expect(result.synced).toBe(2);
    expect(result.remaining).toBe(0);
    expect(store.get('a')?.status).toBe('synced');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a' }),
      { onConflict: 'id' },
    );
  });

  it('is a no-op for already-synced items (idempotent)', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const { deps } = makeDeps([mk('a', 'synced')], upsert);

    const result = await flushOutbox(deps);

    expect(upsert).not.toHaveBeenCalled();
    expect(result.synced).toBe(0);
  });

  it('marks failed and increments attempts on error, never dropping the item', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'network down' } });
    const { store, deps } = makeDeps([mk('a', 'pending', 2)], upsert);

    const result = await flushOutbox(deps);

    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);
    const item = store.get('a');
    expect(item?.status).toBe('failed');
    expect(item?.attempts).toBe(3);
    expect(item?.last_error).toBe('network down');
  });
});

describe('backoffMs', () => {
  it('grows exponentially from 1s and caps at 30s', () => {
    expect(backoffMs(0)).toBe(1000);
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(2)).toBe(4000);
    expect(backoffMs(20)).toBe(30000);
  });
});
