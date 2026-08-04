import { Routes, Route } from 'react-router';
import {
  Calendar,
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
  MessageSquare,
  UserPlus,
  Phone,
  ClipboardCheck,
  FileCheck2,
  Map,
  UsersRound,
  Lock,
  Video,
  Wallet,
  Gift,
} from 'lucide-react';
import App from './App';
import CoachPage from './components/pages/CoachPage';
import AppShell from './components/layout/AppShell';
import DashboardPage from './components/pages/DashboardPage';
import AiAgentPage from './components/pages/AiAgentPage';
import ClientsPage from './components/pages/ClientsPage';
import ProgramsPage from './components/pages/ProgramsPage';
import PlaceholderPage from './components/pages/PlaceholderPage';

const stubRoutes = [
  { path: 'messages', title: 'Messages', icon: MessageSquare },
  { path: 'prospects', title: 'Prospects', icon: UserPlus },
  { path: 'calendar', title: 'Calendar', icon: Calendar },
  { path: 'calls', title: 'Calls', icon: Phone },
  { path: 'check-ins', title: 'Check-ins', icon: ClipboardCheck },
  { path: 'form-checks', title: 'Form Checks', icon: FileCheck2 },
  { path: 'roadmaps', title: 'Roadmaps', icon: Map },
  { path: 'training-groups', title: 'Training Groups', icon: UsersRound },
  { path: 'vault', title: 'Vault', icon: Lock },
  { path: 'workouts', title: 'Workouts', icon: BookOpen },
  { path: 'exercises', title: 'Exercises', icon: Dumbbell },
  { path: 'videos', title: 'Videos', icon: Video },
  { path: 'equipment', title: 'Equipment', icon: Wrench },
  { path: 'gyms', title: 'Gyms', icon: Building2 },
  { path: 'foods', title: 'Foods', icon: Apple },
  { path: 'meals', title: 'Meals', icon: UtensilsCrossed },
  { path: 'recipes', title: 'Recipes', icon: ChefHat },
  { path: 'meal-plans', title: 'Meal Plans', icon: ClipboardList },
  { path: 'payments', title: 'Payments', icon: Wallet },
  { path: 'affiliate', title: 'Affiliate', icon: Share2 },
  { path: 'refer-a-coach', title: 'Refer a coach', icon: Gift },
  { path: 'subscription', title: 'Subscription', icon: CreditCard },
  { path: 'settings', title: 'Settings', icon: Settings },
];

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="ai-agent" element={<AiAgentPage />} />
          {stubRoutes.map(({ path, title, icon }) => (
            <Route key={path} path={path} element={<PlaceholderPage title={title} icon={icon} />} />
          ))}
        </Route>
      </Route>
      <Route path="/:slug" element={<CoachPage />} />
    </Routes>
  );
}
