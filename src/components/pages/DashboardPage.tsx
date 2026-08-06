import { useProfile } from '@/components/layout/AppShell';
import CoachDashboard from '@/components/dashboard/CoachDashboard';

export default function DashboardPage() {
  const profile = useProfile();

  return <CoachDashboard firstName={profile.first_name} />;
}
