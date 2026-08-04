import { NavLink } from 'react-router';
import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/shadcn/badge';
import { ScrollArea } from '@/components/ui/shadcn/scroll-area';
import { coachNav, athleteNav, type NavItem } from '@/config/nav';
import { useRole } from '@/context/RoleContext';

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-surface hover:text-foreground',
        )
      }
    >
      <Icon size={16} className="shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <Badge variant="success" className="text-[10px] px-1.5 py-0">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { role, toggleRole } = useRole();
  const nav = role === 'coach' ? coachNav : athleteNav;

  return (
    <aside
      className={cn(
        'hidden md:flex shrink-0 flex-col border-r border-border bg-surface h-screen sticky top-0 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className={cn('flex items-center gap-2.5 px-5 py-4', collapsed && 'justify-center px-0')}>
        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
          <Dumbbell size={16} className="text-primary" />
        </div>
        {!collapsed && <span className="text-lg font-bold text-foreground">Tracked</span>}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <nav className="px-3 py-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            {nav.top.map((item) => (
              <NavRow key={item.path} item={item} collapsed={collapsed} />
            ))}
          </div>

          {nav.sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => (
                <NavRow key={item.path} item={item} collapsed={collapsed} />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        {collapsed ? (
          <button
            type="button"
            onClick={toggleRole}
            title={role === 'coach' ? 'For Coaches' : 'For Athletes'}
            className="w-full rounded-lg bg-background py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          >
            {role === 'coach' ? 'Coach' : 'Athlete'}
          </button>
        ) : (
          <div className="flex rounded-lg bg-background p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => role !== 'athlete' && toggleRole()}
              className={cn(
                'flex-1 rounded-md py-1.5 transition-colors',
                role === 'athlete' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              For Athletes
            </button>
            <button
              type="button"
              onClick={() => role !== 'coach' && toggleRole()}
              className={cn(
                'flex-1 rounded-md py-1.5 transition-colors',
                role === 'coach' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              For Coaches
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
