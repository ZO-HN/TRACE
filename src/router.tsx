import { Routes, Route } from 'react-router';
import {
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
} from 'lucide-react';
import App from './App';
import CoachPage from './components/pages/CoachPage';
import AppShell from './components/layout/AppShell';
import DashboardPage from './components/pages/DashboardPage';
import AiAgentPage from './components/pages/AiAgentPage';
import PlaceholderPage from './components/pages/PlaceholderPage';

const stubRoutes = [
  { path: 'calendar', title: 'Calendar', icon: Calendar },
  { path: 'programs', title: 'Programs', icon: FolderKanban },
  { path: 'workouts', title: 'Workouts', icon: BookOpen },
  { path: 'exercises', title: 'Exercises', icon: Dumbbell },
  { path: 'equipment', title: 'Equipment', icon: Wrench },
  { path: 'gyms', title: 'Gyms', icon: Building2 },
  { path: 'foods', title: 'Foods', icon: Apple },
  { path: 'meals', title: 'Meals', icon: UtensilsCrossed },
  { path: 'recipes', title: 'Recipes', icon: ChefHat },
  { path: 'meal-plans', title: 'Meal Plans', icon: ClipboardList },
  { path: 'affiliate', title: 'Affiliate', icon: Share2 },
  { path: 'subscription', title: 'Subscription', icon: CreditCard },
  { path: 'settings', title: 'Settings', icon: Settings },
];

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
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
