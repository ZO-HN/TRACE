import { NavLink } from 'react-router';
import { nav, type NavItem } from '@/config/nav';

// One hue family per nav section, cycled across that section's items —
// see design_handoff_sidebar_copilot/README.md (Change 1).
const SECTION_COLORS: Record<string, string[]> = {
  Primary: ['#818cf8', '#6366f1', '#4f46e5'],
  Coaching: ['#16a34a', '#15803d', '#22a55a', '#1e9e50', '#178045'],
  Training: ['#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9'],
  Nutrition: ['#fb923c', '#f97316', '#ea580c'],
  Account: ['#94a3b8'],
};

interface DockGroup {
  key: string;
  items: NavItem[];
}

const GROUPS: DockGroup[] = [
  { key: 'Primary', items: nav.top },
  ...nav.sections.map((s) => ({ key: s.title, items: s.items })),
];

function DockTile({ item, color }: { item: NavItem; color: string }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) => `dock-tile group relative flex items-center justify-center shrink-0 pointer-events-auto${isActive ? ' dock-tile-active' : ''}`}
      style={{ '--ic': color } as React.CSSProperties}
    >
      {({ isActive }) => (
        <>
          <span className="dock-tile-fill absolute inset-0 m-auto" />
          <span
            className="dock-tooltip absolute px-2.5 py-1.5 rounded-lg bg-[#15171c] text-white text-[12.5px] font-medium tracking-tight leading-none whitespace-nowrap opacity-0 -translate-x-1.5 scale-95 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 group-hover:pointer-events-auto"
            style={{ left: 'calc(100% + 14px)' }}
          >
            {item.label}
          </span>
          <Icon size={20} className="text-white relative z-10" strokeWidth={2} />
          {isActive && <span className="dock-tile-active-dot" />}
        </>
      )}
    </NavLink>
  );
}

export default function Dock() {
  return (
    <nav
      className="dock-nav fixed left-3 top-20 bottom-4 z-40 flex flex-col items-center gap-2 overflow-y-auto overflow-x-visible py-1 pr-44 pointer-events-none"
      aria-label="Primary"
    >
      {GROUPS.map((group, groupIndex) => (
        <div key={group.key} className="flex flex-col items-center gap-2.5">
          {groupIndex > 0 && <span className="dock-divider" />}
          {group.items.map((item, i) => (
            <DockTile
              key={item.path}
              item={item}
              color={SECTION_COLORS[group.key][i % SECTION_COLORS[group.key].length]}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}
