import { NavLink } from 'react-router';
import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/shadcn/badge';
import { navSections, topNavItems, type NavItem } from '@/config/nav';
import { useRole } from '@/context/RoleContext';

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-surface hover:text-foreground',
        )
      }
    >
      <Icon size={16} />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <Badge variant="success" className="text-[10px] px-1.5 py-0">
          {item.badge}
        </Badge>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { role, toggleRole } = useRole();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-surface h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Dumbbell size={16} className="text-primary" />
        </div>
        <span className="text-lg font-bold text-foreground">Tracked</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          {topNavItems.map((item) => (
            <NavRow key={item.path} item={item} />
          ))}
        </div>

        {navSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
              {section.title}
            </p>
            {section.items.map((item) => (
              <NavRow key={item.path} item={item} />
            ))}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
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
      </div>
    </aside>
  );
}
