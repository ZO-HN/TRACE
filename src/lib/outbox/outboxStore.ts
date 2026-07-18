// Zustand store: a reactive in-memory mirror of the durable IndexedDB outbox.
// UI reads from here; writes go through IndexedDB first, then update the mirror.

import { create } from 'zustand';
import type { OutboxItem, SetLogInsert } from './types';
import { getAllOutboxItems, putOutboxItem } from './db';

interface OutboxState {
  items: OutboxItem[];
  /** Load the current outbox contents from IndexedDB into memory. */
  hydrate: () => Promise<void>;
  /** Persist a new set log and mark it pending. */
  enqueue: (payload: SetLogInsert) => Promise<OutboxItem>;
  /** Count of items not yet synced. */
  pendingCount: () => number;
}

export const useOutboxStore = create<OutboxState>((set, get) => ({
  items: [],

  hydrate: async () => {
    set({ items: await getAllOutboxItems() });
  },

  enqueue: async (payload) => {
    const item: OutboxItem = {
      id: payload.id,
      payload,
      status: 'pending',
      attempts: 0,
      updated_at: new Date().toISOString(),
    };
    await putOutboxItem(item);
    set({ items: [...get().items.filter((i) => i.id !== item.id), item] });
    return item;
  },

  pendingCount: () =>
    get().items.filter((i) => i.status === 'pending' || i.status === 'failed')
      .length,
}));
