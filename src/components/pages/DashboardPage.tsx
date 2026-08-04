import { useProfile } from '@/components/layout/AppShell';
import { useRole } from '@/context/RoleContext';
import CoachDashboard from '@/components/dashboard/CoachDashboard';
import AthleteDashboard from '@/components/dashboard/AthleteDashboard';

export default function DashboardPage() {
  const profile = useProfile();
  const { role } = useRole();

  return role === 'coach' ? (
    <CoachDashboard firstName={profile.first_name} />
  ) : (
    <AthleteDashboard firstName={profile.first_name} />
  );
}
