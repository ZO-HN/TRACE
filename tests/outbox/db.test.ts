import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOutbox,
  deleteOutboxItem,
  getAllOutboxItems,
  getUnsyncedItems,
  putOutboxItem,
} from '../../src/lib/outbox/db';
import type { OutboxItem, OutboxStatus } from '../../src/lib/outbox/types';

const mk = (id: string, status: OutboxStatus = 'pending'): OutboxItem => ({
  id,
  status,
  attempts: 0,
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

beforeEach(async () => {
  await clearOutbox();
});

describe('outbox db (IndexedDB persistence)', () => {
  it('persists and reads back an item (survives a reload)', async () => {
    await putOutboxItem(mk('a'));
    const all = await getAllOutboxItems();
    expect(all).toHaveLength(1);
    expect(all[0].payload.weight_kg).toBe(100);
  });

  it('does not write the generated estimated_1rm column', async () => {
    await putOutboxItem(mk('a'));
    const [item] = await getAllOutboxItems();
    expect('estimated_1rm' in item.payload).toBe(false);
  });

  it('filters to unsynced items only', async () => {
    await putOutboxItem(mk('a', 'pending'));
    await putOutboxItem(mk('b', 'synced'));
    await putOutboxItem(mk('c', 'failed'));
    const unsynced = await getUnsyncedItems();
    expect(unsynced.map((i) => i.id).sort()).toEqual(['a', 'c']);
  });

  it('deletes and clears', async () => {
    await putOutboxItem(mk('a'));
    await deleteOutboxItem('a');
    expect(await getAllOutboxItems()).toHaveLength(0);
  });
});
