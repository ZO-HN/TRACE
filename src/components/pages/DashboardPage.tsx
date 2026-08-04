import { motion } from 'framer-motion';
import { Activity, Flame, Layers, FolderKanban } from 'lucide-react';
import { useDeviceSize } from '@/hooks/useDeviceSize';
import { useProfile } from '@/components/layout/AppShell';
import StatCard from '@/components/dashboard/StatCard';
import AiBrainPanel from '@/components/chat/AiBrainPanel';
import AppControlCopilot from '@/components/chat/AppControlCopilot';
import RosterPanel from '@/components/coach/RosterPanel';
import TemplateBuilder from '@/components/coach/TemplateBuilder';

// TODO: wire real stats query — this repo has no stats-fetching hook yet.
const placeholderStats = {
  workouts: 0,
  streak: 0,
  totalSets: 0,
  programs: 0,
};

export default function DashboardPage() {
  const profile = useProfile();
  const { isDesktop } = useDeviceSize();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full mx-auto p-6 flex flex-col gap-6 max-w-7xl"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Workouts" value={placeholderStats.workouts} icon={Activity} helperText="Completed this week" />
        <StatCard label="Streak" value={placeholderStats.streak} icon={Flame} helperText="Start your streak today" />
        <StatCard label="Total sets" value={placeholderStats.totalSets} icon={Layers} helperText="Sets this week" />
        <StatCard label="Programs" value={placeholderStats.programs} icon={FolderKanban} helperText="0 active" />
      </div>

      <div className={`grid gap-6 ${isDesktop ? 'grid-cols-[2fr_1fr]' : 'grid-cols-1'}`}>
        <div className="flex flex-col gap-6 min-w-0">
          <AppControlCopilot userId={profile.id} isCoach={true} />
          <TemplateBuilder coachId={profile.id} />
          <RosterPanel coachId={profile.id} />
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          <AiBrainPanel userId={profile.id} />
        </div>
      </div>
    </motion.div>
  );
}
