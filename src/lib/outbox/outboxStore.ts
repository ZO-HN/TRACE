// Zustand store: a reactive in-memory mirror of the durable IndexedDB outbox.
// UI reads from here; writes go through IndexedDB first, then update the mirror.

import { create } from 'zustand';
import type { OutboxItem, SetLogInsert, WorkoutSessionInsert } from './types';
import { getAllOutboxItems, putOutboxItem } from './db';

interface OutboxState {
  items: OutboxItem[];
  /** Load the current outbox contents from IndexedDB into memory. */
  hydrate: () => Promise<void>;
  /** Persist a new set log and mark it pending. */
  enqueueSetLog: (payload: SetLogInsert) => Promise<OutboxItem>;
  /**
   * Queue (or refresh) the parent workout_sessions row. Sessions are
   * insert-once under RLS, so once the item is synced this is a no-op;
   * while still unsynced, the payload (e.g. duration) is refreshed in place.
   */
  ensureSessionQueued: (payload: WorkoutSessionInsert) => Promise<void>;
  /** Count of items not yet synced. */
  pendingCount: () => number;
}

export const useOutboxStore = create<OutboxState>((set, get) => ({
  items: [],

  hydrate: async () => {
    set({ items: await getAllOutboxItems() });
  },

  enqueueSetLog: async (payload) => {
    const item: OutboxItem = {
      id: payload.id,
      table: 'set_logs',
      payload,
      status: 'pending',
      attempts: 0,
      updated_at: new Date().toISOString(),
    };
    await putOutboxItem(item);
    set({ items: [...get().items.filter((i) => i.id !== item.id), item] });
    return item;
  },

  ensureSessionQueued: async (payload) => {
    const existing = get().items.find((i) => i.id === payload.id);
    if (existing?.status === 'synced') return;

    const item: OutboxItem = {
      id: payload.id,
      table: 'workout_sessions',
      payload,
      status: 'pending',
      attempts: existing?.attempts ?? 0,
      updated_at: new Date().toISOString(),
    };
    await putOutboxItem(item);
    set({ items: [...get().items.filter((i) => i.id !== item.id), item] });
  },

  pendingCount: () =>
    get().items.filter((i) => i.status === 'pending' || i.status === 'failed')
      .length,
}));
