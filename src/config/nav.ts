import {
  LayoutDashboard,
  Calendar,
  FolderKanban,
  Dumbbell,
  Wrench,
  Apple,
  UtensilsCrossed,
  ClipboardList,
  Settings,
  Sparkles,
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

// ==========================================
// Coach nav — the real, functional side of this app.
// ==========================================
export const coachNav: NavConfig = {
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
      title: 'AI Intelligence',
      items: [{ label: 'AI Agent', path: '/ai-agent', icon: Sparkles }],
    },
    {
      title: 'Account',
      items: [{ label: 'Settings', path: '/settings', icon: Settings }],
    },
  ],
};

// ==========================================
// Athlete nav — visual placeholder only; no trainee UI lives in this repo.
// ==========================================
export const athleteNav: NavConfig = {
  top: [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
  ],
  sections: [
    {
      title: 'Training',
      items: [
        { label: 'Programs', path: '/programs', icon: FolderKanban },
        { label: 'Workouts', path: '/workouts', icon: Dumbbell },
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
      title: 'AI Intelligence',
      items: [{ label: 'AI Agent', path: '/ai-agent', icon: Sparkles }],
    },
    {
      title: 'Account',
      items: [{ label: 'Settings', path: '/settings', icon: Settings }],
    },
  ],
};
