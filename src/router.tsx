import { Routes, Route } from 'react-router';
import App from './App';
import CoachPage from './components/pages/CoachPage';
import AppShell from './components/layout/AppShell';
import DashboardPage from './components/pages/DashboardPage';
import ClientsPage from './components/pages/ClientsPage';
import MessagesPage from './components/pages/MessagesPage';
import CheckInsPage from './components/pages/CheckInsPage';
import FormChecksPage from './components/pages/FormChecksPage';
import RoadmapsPage from './components/pages/RoadmapsPage';
import VaultPage from './components/pages/VaultPage';
import ProgramsPage from './components/pages/ProgramsPage';
import WorkoutsPage from './components/pages/WorkoutsPage';
import ExercisesPage from './components/pages/ExercisesPage';
import FoodsPage from './components/pages/FoodsPage';
import MealsPage from './components/pages/MealsPage';
import MealPlansPage from './components/pages/MealPlansPage';
import SettingsPage from './components/pages/SettingsPage';
import CalendarPage from './components/pages/CalendarPage';
import TrainingGroupsPage from './components/pages/TrainingGroupsPage';
import EquipmentPage from './components/pages/EquipmentPage';
import LoginPage from './components/pages/LoginPage';
import OnboardingWizardPage from './components/pages/OnboardingWizardPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="onboarding" element={<OnboardingWizardPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="check-ins" element={<CheckInsPage />} />
          <Route path="form-checks" element={<FormChecksPage />} />
          <Route path="roadmaps" element={<RoadmapsPage />} />
          <Route path="training-groups" element={<TrainingGroupsPage />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="equipment" element={<EquipmentPage />} />
          <Route path="foods" element={<FoodsPage />} />
          <Route path="meals" element={<MealsPage />} />
          <Route path="meal-plans" element={<MealPlansPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="/:slug" element={<CoachPage />} />
    </Routes>
  );
}
