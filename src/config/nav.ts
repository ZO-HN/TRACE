import {
  LayoutDashboard,
  Calendar,
  FolderKanban,
  Dumbbell,
  BicepsFlexed,
  Wrench,
  Apple,
  UtensilsCrossed,
  ClipboardList,
  Settings,
  Users,
  MessageSquare,
  ClipboardCheck,
  FileCheck2,
  Map,
  UsersRound,
  Lock,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: 'Beta';
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavConfig {
  top: NavItem[];
  sections: NavSection[];
}

export const nav: NavConfig = {
  top: [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Clients', path: '/clients', icon: Users },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
  ],
  sections: [
    {
      title: 'Coaching',
      items: [
        { label: 'Check-ins', path: '/check-ins', icon: ClipboardCheck },
        { label: 'Form Checks', path: '/form-checks', icon: FileCheck2 },
        { label: 'Roadmaps', path: '/roadmaps', icon: Map },
        { label: 'Training Groups', path: '/training-groups', icon: UsersRound, badge: 'Beta' },
        { label: 'Vault', path: '/vault', icon: Lock },
      ],
    },
    {
      title: 'Training',
      items: [
        { label: 'Programs', path: '/programs', icon: FolderKanban },
        { label: 'Workouts', path: '/workouts', icon: Dumbbell },
        { label: 'Exercises', path: '/exercises', icon: BicepsFlexed },
        { label: 'Equipment', path: '/equipment', icon: Wrench, badge: 'Beta' },
      ],
    },
    {
      title: 'Nutrition',
      items: [
        { label: 'Foods', path: '/foods', icon: Apple },
        { label: 'Meals', path: '/meals', icon: UtensilsCrossed },
        { label: 'Meal Plans', path: '/meal-plans', icon: ClipboardList, badge: 'Beta' },
      ],
    },
    {
      title: 'Account',
      items: [{ label: 'Settings', path: '/settings', icon: Settings }],
    },
  ],
};
