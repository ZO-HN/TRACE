// Flush the outbox to Supabase with idempotent upserts and retry/backoff.
// Pure and dependency-injected so it is unit-testable without a real DB or network.

import { supabase } from '../supabase';
import type { OutboxItem } from './types';
import { getAllOutboxItems, putOutboxItem } from './db';

export const MAX_ATTEMPTS = 5;

/** Exponential backoff in ms: 1s, 2s, 4s, ... capped at 30s. */
export function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30_000);
}

interface UpsertResult {
  error: { message: string } | null;
}

/** Minimal structural surface of the Supabase client used by the flusher. */
export interface OutboxSupabase {
  from(table: string): {
    upsert(
      values: unknown,
      options?: { onConflict?: string },
    ): PromiseLike<UpsertResult>;
  };
}

export interface FlushDeps {
  supabase: OutboxSupabase;
  getItems: () => Promise<OutboxItem[]>;
  saveItem: (item: OutboxItem) => Promise<void>;
  now?: () => string;
}

export interface FlushResult {
  synced: number;
  failed: number;
  remaining: number;
}

/**
 * Flush every pending/failed item exactly once. Already-synced items are
 * skipped, so re-running is a no-op. Upserts use onConflict:'id' so a retry
 * that actually reached the DB last time is also idempotent at the DB layer.
 *
 * Sessions flush before set_logs: set_logs.session_id has a foreign key to
 * workout_sessions, so the parent row must land first.
 */
export async function flushOutbox(deps: FlushDeps): Promise<FlushResult> {
  const now = deps.now ?? (() => new Date().toISOString());
  const items = await deps.getItems();
  const pending = items
    .filter((i) => i.status === 'pending' || i.status === 'failed')
    .sort((a, b) => {
      const rank = (i: OutboxItem) =>
        (i.table ?? 'set_logs') === 'workout_sessions' ? 0 : 1;
      return rank(a) - rank(b);
    });

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    await deps.saveItem({ ...item, status: 'syncing', updated_at: now() });

    const { error } = await deps.supabase
      .from(item.table ?? 'set_logs')
      .upsert(item.payload, { onConflict: 'id' });

    if (error) {
      await deps.saveItem({
        ...item,
        status: 'failed',
        attempts: item.attempts + 1,
        updated_at: now(),
        last_error: error.message,
      });
      failed++;
    } else {
      await deps.saveItem({ ...item, status: 'synced', updated_at: now() });
      synced++;
    }
  }

  const after = await deps.getItems();
  const remaining = after.filter((i) => i.status !== 'synced').length;
  return { synced, failed, remaining };
}

/** Flush using the real Supabase client and IndexedDB persistence. */
export function flushOutboxLive(): Promise<FlushResult> {
  return flushOutbox({
    supabase: supabase as unknown as OutboxSupabase,
    getItems: getAllOutboxItems,
    saveItem: putOutboxItem,
  });
}
