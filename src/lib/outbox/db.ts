// IndexedDB persistence for the offline outbox.
// Durable across page reloads so logged sets survive with no network.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { OutboxItem } from './types';

const DB_NAME = 'trace-outbox';
const DB_VERSION = 1;
const STORE = 'outbox';

interface OutboxDB extends DBSchema {
  outbox: {
    key: string;
    value: OutboxItem;
  };
}

let dbPromise: Promise<IDBPDatabase<OutboxDB>> | null = null;

function getDb(): Promise<IDBPDatabase<OutboxDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OutboxDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function putOutboxItem(item: OutboxItem): Promise<void> {
  const db = await getDb();
  await db.put(STORE, item);
}

export async function getAllOutboxItems(): Promise<OutboxItem[]> {
  const db = await getDb();
  return db.getAll(STORE);
}

/** Items not yet confirmed synced (pending, syncing, or failed). */
export async function getUnsyncedItems(): Promise<OutboxItem[]> {
  const all = await getAllOutboxItems();
  return all.filter((i) => i.status !== 'synced');
}

export async function deleteOutboxItem(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function clearOutbox(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
}
