import {
  LayoutDashboard,
  Calendar,
  FolderKanban,
  BookOpen,
  Dumbbell,
  Wrench,
  Building2,
  Apple,
  UtensilsCrossed,
  ChefHat,
  ClipboardList,
  Share2,
  CreditCard,
  Settings,
  Sparkles,
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

export const topNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
];

export const navSections: NavSection[] = [
  {
    title: 'Training',
    items: [
      { label: 'Programs', path: '/programs', icon: FolderKanban },
      { label: 'Workouts', path: '/workouts', icon: BookOpen },
      { label: 'Exercises', path: '/exercises', icon: Dumbbell },
      { label: 'Equipment', path: '/equipment', icon: Wrench, badge: 'Beta' },
      { label: 'Gyms', path: '/gyms', icon: Building2, badge: 'Beta' },
    ],
  },
  {
    title: 'Nutrition',
    items: [
      { label: 'Foods', path: '/foods', icon: Apple },
      { label: 'Meals', path: '/meals', icon: UtensilsCrossed },
      { label: 'Recipes', path: '/recipes', icon: ChefHat, badge: 'Beta' },
      { label: 'Meal Plans', path: '/meal-plans', icon: ClipboardList, badge: 'Beta' },
    ],
  },
  {
    title: 'AI Intelligence',
    items: [{ label: 'AI Agent', path: '/ai-agent', icon: Sparkles }],
  },
  {
    title: 'Business',
    items: [{ label: 'Affiliate', path: '/affiliate', icon: Share2 }],
  },
  {
    title: 'Account',
    items: [
      { label: 'Subscription', path: '/subscription', icon: CreditCard },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];
