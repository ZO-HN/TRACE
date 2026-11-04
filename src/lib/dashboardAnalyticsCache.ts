import type { DashboardSnapshot } from '../hooks/useDashboardStats';

export const DASHBOARD_FRESH_MS = 30_000;
export interface AnalyticsState {
  data: DashboardSnapshot | null;
  updatedAt: number | null;
  isUpdating: boolean;
  error: string | null;
}
const emptyState: AnalyticsState = { data: null, updatedAt: null, isUpdating: false, error: null };
let state = emptyState;
let userId: string | null = null;
let verifiedProfile: string | null = null;
let generation = 0;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: AnalyticsState) {
  state = next;
  listeners.forEach((listener) => listener());
}
function clear() {
  generation += 1;
  pending = null;
  publish({ ...emptyState });
}

// No credentials or persistence: server authorization still applies to every RPC.
export function setDashboardIdentity(id: string | null) {
  if (id === userId && id !== null) return;
  userId = id;
  verifiedProfile = null;
  clear();
}
export function verifyDashboardProfile(id: string, profile: { id: string; role: string } | null) {
  if (id !== userId) return;
  const next = profile?.id === id && profile.role === 'coach' ? JSON.stringify(profile) : null;
  if (next === verifiedProfile) return;
  verifiedProfile = next;
  clear();
}
export function dashboardEligible(id: string) {
  return userId === id && verifiedProfile !== null;
}
export function subscribeDashboard(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function getDashboardRevision() { return generation; }
export function getDashboardState() { return state; }
export function getEmptyDashboardState() { return emptyState; }

export function readDashboard(id: string, load: () => Promise<DashboardSnapshot>, force = false): Promise<void> {
  if (!dashboardEligible(id)) return Promise.resolve();
  if (pending) return pending;
  if (!force && state.updatedAt !== null && Date.now() - state.updatedAt < DASHBOARD_FRESH_MS) return Promise.resolve();
  const revision = generation;
  publish({ ...state, isUpdating: true, error: null });
  // Defer loading so synchronous failures also reach the common error path.
  const request = Promise.resolve().then(() => {
    if (revision !== generation) throw new Error('Dashboard account changed');
    return load();
  }).then((data) => {
    if (revision === generation) publish({ data, updatedAt: Date.now(), isUpdating: false, error: null });
  }).catch((cause: unknown) => {
    if (revision === generation) publish({ ...state, isUpdating: false,
      error: cause instanceof Error ? cause.message : 'Could not refresh dashboard' });
  }).finally(() => {
    if (revision === generation) pending = null;
  });
  pending = request;
  return request;
}
