import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushOutbox, type FlushDeps } from '../../src/lib/outbox/sync';
import { useOutboxStore } from '../../src/lib/outbox/outboxStore';
import { clearOutbox, getAllOutboxItems, putOutboxItem } from '../../src/lib/outbox/db';
import type { OutboxItem, WorkoutSessionInsert } from '../../src/lib/outbox/types';

const sessionInsert = (id = 'sess-1'): WorkoutSessionInsert => ({
  id,
  user_id: 'user-1',
  session_name: 'Current Workout',
  duration_seconds: 120,
});

const setItem = (id: string): OutboxItem => ({
  id,
  table: 'set_logs',
  status: 'pending',
  attempts: 0,
  updated_at: '2026-01-01T00:00:00.000Z',
  payload: {
    id,
    session_id: 'sess-1',
    exercise_id: 'ex-1',
    set_number: 1,
    weight_kg: 60,
    reps: 5,
  },
});

const sessionItem = (id = 'sess-1'): OutboxItem => ({
  id,
  table: 'workout_sessions',
  status: 'pending',
  attempts: 0,
  updated_at: '2026-01-01T00:00:00.000Z',
  payload: sessionInsert(id),
});

beforeEach(async () => {
  await clearOutbox();
  useOutboxStore.setState({ items: [] });
});

describe('flushOutbox ordering', () => {
  it('flushes workout_sessions before set_logs regardless of queue order', async () => {
    const calls: string[] = [];
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const store = new Map<string, OutboxItem>();
    // set log queued BEFORE its parent session
    for (const item of [setItem('set-1'), sessionItem()]) store.set(item.id, item);

    const deps: FlushDeps = {
      supabase: {
        from: (table: string) => {
          calls.push(table);
          return { upsert };
        },
      },
      getItems: async () => [...store.values()],
      saveItem: async (i) => {
        store.set(i.id, i);
      },
      now: () => '2026-01-01T00:00:00.000Z',
    };

    await flushOutbox(deps);
    expect(calls).toEqual(['workout_sessions', 'set_logs']);
  });

  it('defaults legacy items without a table field to set_logs', async () => {
    const tables: string[] = [];
    const legacy = { ...setItem('legacy-1') };
    delete legacy.table;
    await putOutboxItem(legacy);

    const deps: FlushDeps = {
      supabase: {
        from: (table: string) => {
          tables.push(table);
          return { upsert: vi.fn().mockResolvedValue({ error: null }) };
        },
      },
      getItems: getAllOutboxItems,
      saveItem: putOutboxItem,
    };

    await flushOutbox(deps);
    expect(tables).toEqual(['set_logs']);
  });
});

describe('ensureSessionQueued', () => {
  it('queues a new session as pending', async () => {
    await useOutboxStore.getState().ensureSessionQueued(sessionInsert());
    const items = await getAllOutboxItems();
    expect(items).toHaveLength(1);
    expect(items[0].table).toBe('workout_sessions');
    expect(items[0].status).toBe('pending');
  });

  it('refreshes the payload while unsynced (duration updates)', async () => {
    await useOutboxStore.getState().ensureSessionQueued(sessionInsert());
    await useOutboxStore
      .getState()
      .ensureSessionQueued({ ...sessionInsert(), duration_seconds: 300 });

    const items = await getAllOutboxItems();
    expect(items).toHaveLength(1);
    expect((items[0].payload as WorkoutSessionInsert).duration_seconds).toBe(300);
  });

  it('is a no-op once the session is synced (insert-once under RLS)', async () => {
    const synced: OutboxItem = { ...sessionItem(), status: 'synced' };
    await putOutboxItem(synced);
    await useOutboxStore.getState().hydrate();

    await useOutboxStore
      .getState()
      .ensureSessionQueued({ ...sessionInsert(), duration_seconds: 999 });

    const items = await getAllOutboxItems();
    expect(items[0].status).toBe('synced');
    expect((items[0].payload as WorkoutSessionInsert).duration_seconds).toBe(120);
  });
});
