import { motion } from 'framer-motion';
import { Activity, Flame, Layers, FolderKanban, TrendingUp, Dumbbell } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/shadcn/card';
import StatCard from './StatCard';
import EmptyPanel from './EmptyPanel';

// TODO: wire real stats query — this repo has no stats-fetching hook yet, and
// there is no trainee-facing functionality in this repo (see project CLAUDE.md).
const placeholderStats = {
  workouts: 0,
  streak: 0,
  totalSets: 0,
  programs: 0,
};

export default function AthleteDashboard({ firstName }: { firstName?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full mx-auto p-6 flex flex-col gap-6 max-w-7xl"
    >
      <h1 className="text-xl font-bold text-foreground">Welcome, {firstName ?? 'Athlete'}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Workouts" value={placeholderStats.workouts} icon={Activity} helperText="Completed this week" />
        <StatCard label="Streak" value={placeholderStats.streak} icon={Flame} helperText="Start your streak today" />
        <StatCard label="Total sets" value={placeholderStats.totalSets} icon={Layers} helperText="Sets this week" />
        <StatCard label="Programs" value={placeholderStats.programs} icon={FolderKanban} helperText="0 active" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Net progression</CardTitle>
          <TrendingUp size={16} className="text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-3xl font-bold text-foreground">—</p>
          <p className="text-xs text-muted-foreground mt-1">No data yet</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-foreground">Your workouts</h2>
        <p className="text-xs text-muted-foreground mb-2">Your recently completed training sessions</p>
        <Card>
          <EmptyPanel
            icon={Dumbbell}
            title="No workouts yet"
            description="Complete your first workout and it will appear here."
          />
        </Card>
      </div>
    </motion.div>
  );
}
