import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { dashboardEligible, getDashboardState, readDashboard, setDashboardIdentity, verifyDashboardProfile } from '../../src/lib/dashboardAnalyticsCache';
import type { DashboardSnapshot } from '../../src/hooks/useDashboardStats';
const snapshot: DashboardSnapshot = { stats: { newSignups7d: 1, workouts7d: 2, churnedCount: 0 }, wins: [], nutrition: [], steps: [], cardio: [] };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(100_000); setDashboardIdentity(null); setDashboardIdentity('a'); verifyDashboardProfile('a', { id: 'a', role: 'coach' }); });
afterEach(() => { setDashboardIdentity(null); vi.useRealTimers(); });
it('invalidates a changed verified profile but preserves an unchanged profile snapshot', async () => {
  const load = vi.fn().mockResolvedValue(snapshot);
  await readDashboard('a', load);
  verifyDashboardProfile('a', { id: 'a', role: 'coach' }); await readDashboard('a', load);
  expect(load).toHaveBeenCalledTimes(1);
  const changed = { id: 'a', role: 'coach', first_name: 'Changed' };
  verifyDashboardProfile('a', changed);
  expect(getDashboardState().data).toBeNull();
  await readDashboard('a', load); expect(load).toHaveBeenCalledTimes(2);
});
it('never starts a scheduled old-generation transport after account invalidation', async () => {
  const load = vi.fn().mockResolvedValue(snapshot);
  const request = readDashboard('a', load);
  setDashboardIdentity('b'); await request;
  expect(load).not.toHaveBeenCalled(); expect(getDashboardState().data).toBeNull();
});
it('rejects a mismatching profile and ignores verification from an old identity', () => {
  verifyDashboardProfile('a', { id: 'b', role: 'coach' }); expect(dashboardEligible('a')).toBe(false);
  setDashboardIdentity('b'); verifyDashboardProfile('a', { id: 'a', role: 'coach' }); expect(dashboardEligible('b')).toBe(false);
});

it('keeps the newer account snapshot when an older request settles last', async () => {
  let resolve!: (value: DashboardSnapshot) => void;
  const old = readDashboard('a', () => new Promise<DashboardSnapshot>((done) => { resolve = done; }));
  await Promise.resolve();
  setDashboardIdentity('b'); verifyDashboardProfile('b', { id: 'b', role: 'coach' });
  const newer = { ...snapshot, stats: { ...snapshot.stats, workouts7d: 8 } };
  await readDashboard('b', async () => newer);
  resolve(snapshot); await old;
  expect(getDashboardState().data?.stats.workouts7d).toBe(8);
});
