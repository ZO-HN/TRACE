import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { HookHarness, cleanup, settle } from '../hooks/hookHarness';
import TemplateBuilder from '../../src/components/coach/TemplateBuilder';
import WorkoutsPage from '../../src/components/pages/WorkoutsPage';

// Executes actual component handlers and hooks with controlled effects/transport.
// This is not DOM, browser, Supabase or SQL acceptance evidence.
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../hooks/hookHarness')).reactHooks,
}));
const api = vi.hoisted(() => ({ rpc: vi.fn(), read: vi.fn() }));
vi.mock('../../src/components/layout/AppShell', () => ({ useProfile: () => ({ id: 'coach', role: 'coach' }) }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  rpc: (...args: unknown[]) => api.rpc(...args),
  from: (table: string) => {
    const query = { select: () => query, eq: () => query,
      order: (column: string) => table === 'exercises' || column === 'id' ? api.read(table) : query };
    return query;
  },
} }));
type Element = ReactElement<Record<string, any>>;
function nodes(value: any): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !value.props) return [];
  return [value, ...nodes(value.props.children)];
}
function text(value: any): string {
  if (Array.isArray(value)) return value.map(text).join('');
  return value?.props ? text(value.props.children) : typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
function button(root: Element, label: string) {
  const found = nodes(root).find((node) => node.type === 'button' && (node.props['aria-label'] === label || text(node).includes(label)));
  if (!found) throw new Error(`Missing button ${label}`);
  return found;
}
function field(root: Element, label: string) {
  const found = nodes(root).find((node) => ['input', 'select', 'textarea'].includes(node.type as string) && node.props['aria-label'] === label);
  if (!found) throw new Error(`Missing field ${label}`);
  return found;
}
beforeEach(() => {
  api.read.mockReset().mockImplementation(async (table) => ({ data: table === 'exercises' ? [{ id: 'squat', name: 'Squat' }, { id: 'row', name: 'Row' }] : [], error: null }));
  api.rpc.mockReset().mockImplementation(async (_name, payload) => ({ data: payload.p_template_id, error: null }));
});
afterEach(cleanup);

it('adds/removes/reorders prescriptions and retains failed input and retry IDs across close/reopen', async () => {
  const onSaved = vi.fn(); const hook = new HookHarness(() => TemplateBuilder({ coachId: 'coach', onSaved }));
  button(hook.current, 'Create workout').props.onClick(); await settle();
  const nameInput = nodes(hook.current).find((node) => node.type === 'input' && node.props.maxLength === 150)!;
  nameInput.props.onChange({ target: { value: 'Exact workout' } }); await settle();
  field(hook.current, 'Exercise 1').props.onChange({ target: { value: 'squat' } }); await settle();
  button(hook.current, 'Add exercise').props.onClick(); await settle();
  field(hook.current, 'Exercise 2').props.onChange({ target: { value: 'row' } }); await settle();
  field(hook.current, 'Rest seconds exercise 2').props.onChange({ target: { value: '0' } }); await settle();
  field(hook.current, 'Reps exercise 2').props.onChange({ target: { value: '12' } }); await settle();
  button(hook.current, 'Move exercise 2 up').props.onClick(); await settle();
  expect(field(hook.current, 'Exercise 1').props.value).toBe('row');
  expect(field(hook.current, 'Reps exercise 1').props.value).toBe('12');
  button(hook.current, 'Add exercise').props.onClick(); await settle();
  button(hook.current, 'Remove exercise 3').props.onClick(); await settle();
  api.rpc.mockRejectedValueOnce(new Error('Lost response'));
  await button(hook.current, 'Save & Close').props.onClick(); await settle();
  expect(onSaved).not.toHaveBeenCalled(); expect(text(hook.current)).toContain('Your draft is retained');
  button(hook.current, 'Close and keep draft').props.onClick(); await settle();
  button(hook.current, 'Resume workout draft').props.onClick(); await settle();
  expect(field(hook.current, 'Exercise 1').props.value).toBe('row');
  await button(hook.current, 'Retry save').props.onClick(); await settle();
  expect(api.rpc.mock.calls[1]).toEqual(api.rpc.mock.calls[0]);
  expect(api.rpc.mock.calls[0][1].p_items.map((item: any) => [item.exercise_id, item.position, item.target_reps, item.rest_seconds])).toEqual([['row', 1, 12, 0], ['squat', 2, 8, 90]]);
  expect(onSaved).toHaveBeenCalledTimes(1); expect(nodes(hook.current).some((node) => node.props.role === 'dialog')).toBe(false);
});

it('the routed page mounts the durable builder and reads prescriptions again on remount', async () => {
  api.read.mockImplementation(async () => ({ data: [{ id: 'stored', name: 'Persisted workout', description: 'Stored description', created_at: '2026-11-01',
    template_items: [{ id: 'item', position: 1, exercise_id: 'squat', exercise: { id: 'squat', name: 'Squat' }, target_sets: 4, target_reps: 6, target_rpe: 8, rest_seconds: 150 }] }], error: null }));
  const renderRoute = () => { const page = WorkoutsPage() as Element; return (page.type as (props: any) => Element)(page.props); };
  const hook = new HookHarness(renderRoute); await settle();
  expect(nodes(hook.current).some((node) => node.type === TemplateBuilder)).toBe(true);
  expect(text(hook.current)).toContain('Persisted workout'); expect(text(hook.current)).toContain('4 sets × 6 reps · RPE 8 · Rest 150s');
  expect(text(hook.current)).toContain('Assignment unavailable');
  hook.unmount(); const reloaded = new HookHarness(renderRoute); await settle();
  expect(api.read).toHaveBeenCalledTimes(2); expect(text(reloaded.current)).toContain('Stored description');
});

it('reports exercise catalog failure explicitly and can retry', async () => {
  api.read.mockResolvedValueOnce({ data: null, error: { message: 'Catalog offline' } });
  const hook = new HookHarness(() => TemplateBuilder({ coachId: 'coach', onSaved: vi.fn() }));
  button(hook.current, 'Create workout').props.onClick(); await settle();
  expect(text(hook.current)).toContain('Catalog offline');
  expect(button(hook.current, 'Save & Close').props.disabled).toBe(true);
  button(hook.current, 'Retry exercises').props.onClick(); await settle();
  expect(text(hook.current)).not.toContain('Catalog offline'); expect(text(hook.current)).toContain('Squat');
});
