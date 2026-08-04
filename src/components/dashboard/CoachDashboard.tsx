import { motion } from 'framer-motion';
import { Users, UserPlus, Activity, UserMinus, Trophy, AlertTriangle, CheckCircle2, Footprints, Apple, HeartPulse, ArrowDownRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import StatCard from './StatCard';
import EmptyPanel from './EmptyPanel';
import GettingStartedCard from './GettingStartedCard';

// TODO: wire real client/workout/churn stats — this repo has no stats-fetching hook yet.
const placeholderStats = {
  totalClients: { value: 0, active: 0, trial: 0 },
  newSignups: 0,
  workouts: 0,
  churned: 0,
};

export default function CoachDashboard({ firstName }: { firstName?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full mx-auto p-6 flex flex-col gap-6 max-w-7xl"
    >
      <h1 className="text-xl font-bold text-foreground">Welcome, {firstName ?? 'Coach'}</h1>

      <GettingStartedCard />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total clients"
          value={placeholderStats.totalClients.value}
          icon={Users}
          helperText={`${placeholderStats.totalClients.active} active · ${placeholderStats.totalClients.trial} trial`}
        />
        <StatCard label="New signups" value={placeholderStats.newSignups} icon={UserPlus} helperText="Last 7 days" />
        <StatCard label="Workouts" value={placeholderStats.workouts} icon={Activity} helperText="Completed in last 7 days" />
        <StatCard label="Churned" value={placeholderStats.churned} icon={UserMinus} helperText="Last 30 days" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Wins this week</h2>
        <Card>
          <EmptyPanel icon={Trophy} title="No new wins to celebrate yet" description="Check back soon." />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              Needs attention
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">Clients flagged by urgency</span>
            </CardTitle>
            <AlertTriangle size={16} className="text-muted-foreground" />
          </CardHeader>
          <EmptyPanel
            icon={CheckCircle2}
            title="All caught up"
            description="No clients need attention right now. Check-ins, workouts, and logging are all on track."
          />
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              Client steps
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                Last 7 days — who's hitting their movement targets
              </span>
            </CardTitle>
            <Footprints size={16} className="text-muted-foreground" />
          </CardHeader>
          <EmptyPanel
            icon={Footprints}
            title="No clients yet"
            description="Add clients to see their step counts here."
            ctaLabel="Invite a client"
          />
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Client nutrition</h2>
        <p className="text-xs text-muted-foreground -mt-1 mb-2">Last 7 days — who's logging and how intake tracks to goal</p>
        <Card>
          <EmptyPanel
            icon={Apple}
            title="No clients yet"
            description="Add clients to see their nutrition logging here."
            ctaLabel="Invite a client"
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              Client cardio
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                Last 7 days — who's getting their conditioning in
              </span>
            </CardTitle>
            <HeartPulse size={16} className="text-muted-foreground" />
          </CardHeader>
          <EmptyPanel icon={HeartPulse} title="No clients yet" description="Add clients to see cardio activity here." />
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              Behind on cardio
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                Clients under their weekly cardio goal, furthest behind first
              </span>
            </CardTitle>
            <ArrowDownRight size={16} className="text-muted-foreground" />
          </CardHeader>
          <EmptyPanel icon={ArrowDownRight} title="No clients yet" description="Add clients to track cardio goals here." />
        </Card>
      </div>
    </motion.div>
  );
}
