import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ExercisesPage from '../../src/components/pages/ExercisesPage';

const catalog = vi.hoisted(() => ({ current: { exercises: [], isLoading: false, error: null, search: '', setSearch: vi.fn(),
  isLoadingMore: false, hasMore: true, refresh: vi.fn(), loadMore: vi.fn(), createExercise: vi.fn() } }));
vi.mock('../../src/components/layout/AppShell', () => ({ useProfile: () => ({ id: 'coach' }) }));
vi.mock('../../src/hooks/useExercises', () => ({ useExercises: () => catalog.current }));
vi.mock('../../src/components/exercises/NewExerciseDialog', () => ({ default: () => null }));
vi.mock('../../src/components/ui/shadcn/badge', () => ({ Badge: () => null }));
vi.mock('../../src/components/ui/shadcn/popover', () => ({ Popover: () => null, PopoverTrigger: () => null, PopoverContent: () => null }));
vi.mock('lucide-react', () => Object.fromEntries(['ArrowUpDown', 'BicepsFlexed', 'Check', 'Plus', 'Settings2'].map(name => [name, () => null])));

describe('exercise catalog controls', () => {
  it('shows search, refresh, and load-more controls for a paged catalog', () => {
    const html = renderToStaticMarkup(createElement(ExercisesPage));
    expect(html).toContain('Search exercises');
    expect(html).toContain('Refresh');
    expect(html).toContain('Load more exercises');
  });

  it('shows a search-specific empty state', () => {
    catalog.current = { ...catalog.current, hasMore: false, search: 'press' };
    expect(renderToStaticMarkup(createElement(ExercisesPage))).toContain('No matching exercises');
  });
});
