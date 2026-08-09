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
      title={item.label}
      className="dock-tile group relative flex items-center justify-center shrink-0"
      style={({ isActive }) => ({ '--ic': isActive ? 'var(--accent)' : color }) as React.CSSProperties}
    >
      {({ isActive }) => (
        <>
          <span
            className="absolute px-2.5 py-1 rounded-md bg-[#0c0d10] text-white text-xs font-medium whitespace-nowrap opacity-0 -translate-y-1 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:-translate-y-2 group-hover:pointer-events-auto"
            style={{ bottom: 'calc(100% + 12px)' }}
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
      className="fixed left-1/2 bottom-5 z-40 flex items-end gap-2.5"
      style={{ transform: 'translateX(-50%)' }}
      aria-label="Primary"
    >
      {GROUPS.map((group, groupIndex) => (
        <div key={group.key} className="flex items-end gap-2.5">
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
