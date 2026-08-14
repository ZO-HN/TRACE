import { motion } from 'framer-motion';
import { Users, UserPlus, Activity, UserMinus, Trophy, AlertTriangle, CheckCircle2, Footprints, Apple, HeartPulse, ArrowDownRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { useProfile } from '@/components/layout/AppShell';
import { useClients } from '@/hooks/useClients';
import { useCheckIns } from '@/hooks/useCheckIns';
import { useFormChecks } from '@/hooks/useFormChecks';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import StatCard from './StatCard';
import EmptyPanel from './EmptyPanel';

export default function CoachDashboard({ firstName }: { firstName?: string }) {
  const profile = useProfile();
  const { clients } = useClients(profile.id);
  const { needsReview } = useCheckIns(profile.id);
  const { formChecks } = useFormChecks(profile.id);
  const { stats, wins, nutrition, steps, cardio, error: statsError } = useDashboardStats(profile.id);

  const unreviewedFormChecks = formChecks.filter((f) => f.status === 'unreviewed').length;
  const needsAttentionCount = needsReview.length + unreviewedFormChecks;
  const loggingClients = nutrition.filter((n) => n.log_count > 0);
  const steppingClients = steps.filter((s) => s.days_logged > 0);
  const activeCardioClients = [...cardio].filter((c) => c.cardio_sessions > 0).sort((a, b) => b.cardio_minutes - a.cardio_minutes);
  // cardio already comes back ascending (least first) from get_coach_cardio_summary,
  // which is exactly "furthest behind first" — no per-client cardio goal exists to
  // compare against, so this ranks by raw minutes done rather than % of a target.

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full mx-auto p-6 flex flex-col gap-6 max-w-7xl"
    >
      <h1 className="text-xl font-bold text-foreground">Welcome, {firstName ?? 'Coach'}</h1>

      {statsError && <p className="text-sm text-danger">Could not load dashboard stats: {statsError}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total clients" value={clients.length} icon={Users} helperText="Currently on your roster" />
        <StatCard label="New signups" value={stats?.newSignups7d ?? 0} icon={UserPlus} helperText="Last 7 days" />
        <StatCard label="Workouts" value={stats?.workouts7d ?? 0} icon={Activity} helperText="Last 7 days" />
        <StatCard
          label="Churned"
          value={stats?.churnedCount ?? 0}
          icon={UserMinus}
          helperText="21+ days inactive, or marked manually"
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Wins this week</h2>
        <Card>
          {wins.length === 0 ? (
            <EmptyPanel icon={Trophy} title="No new wins to celebrate yet" description="Check back soon." />
          ) : (
            <div className="px-5 pb-5 flex flex-col gap-2">
              {wins.map((w, i) => (
                <div
                  key={`${w.client_id}-${w.exercise_name}-${i}`}
                  className="flex items-center justify-between text-sm bg-background border border-border rounded-lg px-3 py-2"
                >
                  <span className="text-foreground">
                    <span className="font-semibold">{w.client_name}</span> hit a new PR on {w.exercise_name}
                  </span>
                  <span className="font-semibold text-primary">
                    {w.weight_kg}kg × {w.reps}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              Needs attention
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">Check-ins and form checks awaiting review</span>
            </CardTitle>
            <AlertTriangle size={16} className="text-muted-foreground" />
          </CardHeader>
          {needsAttentionCount === 0 ? (
            <EmptyPanel
              icon={CheckCircle2}
              title="All caught up"
              description="No check-ins or form checks need review right now."
            />
          ) : (
            <div className="px-5 pb-5 flex flex-col gap-2">
              {needsReview.length > 0 && (
                <div className="flex items-center justify-between text-sm bg-background border border-border rounded-lg px-3 py-2">
                  <span className="text-foreground">Check-ins to review</span>
                  <span className="font-semibold text-primary">{needsReview.length}</span>
                </div>
              )}
              {unreviewedFormChecks > 0 && (
                <div className="flex items-center justify-between text-sm bg-background border border-border rounded-lg px-3 py-2">
                  <span className="text-foreground">Form checks to review</span>
                  <span className="font-semibold text-primary">{unreviewedFormChecks}</span>
                </div>
              )}
            </div>
          )}
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
          {clients.length === 0 ? (
            <EmptyPanel
              icon={Footprints}
              title="No clients yet"
              description="Add clients to see their step counts here."
              ctaLabel="Invite a client"
            />
          ) : steppingClients.length === 0 ? (
            <EmptyPanel
              icon={Footprints}
              title="No steps logged this week"
              description="Nothing in wearable_biometrics.step_count for your clients in the last 7 days."
            />
          ) : (
            <div className="px-5 pb-5 flex flex-col gap-2">
              {steppingClients.map((s) => (
                <div
                  key={s.client_id}
                  className="flex items-center justify-between text-sm bg-background border border-border rounded-lg px-3 py-2"
                >
                  <span className="text-foreground">{s.client_name}</span>
                  <span className="text-muted-foreground">
                    {Math.round(s.avg_daily_steps ?? 0).toLocaleString()} avg/day · {s.days_logged} day
                    {s.days_logged === 1 ? '' : 's'} logged
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Client nutrition</h2>
        <p className="text-xs text-muted-foreground -mt-1 mb-2">Last 7 days — who's logging and how intake tracks to goal</p>
        <Card>
          {clients.length === 0 ? (
            <EmptyPanel
              icon={Apple}
              title="No clients yet"
              description="Add clients to see their nutrition logging here."
              ctaLabel="Invite a client"
            />
          ) : loggingClients.length === 0 ? (
            <EmptyPanel
              icon={Apple}
              title="No nutrition logged this week"
              description="Nothing in nutrition_logs for your clients in the last 7 days."
            />
          ) : (
            <div className="px-5 pb-5 flex flex-col gap-2">
              {nutrition.map((n) => (
                <div
                  key={n.client_id}
                  className="flex items-center justify-between text-sm bg-background border border-border rounded-lg px-3 py-2"
                >
                  <span className="text-foreground">{n.client_name}</span>
                  <span className="text-muted-foreground">
                    {n.log_count === 0
                      ? 'No logs this week'
                      : `${n.log_count} log${n.log_count === 1 ? '' : 's'}${n.avg_calories ? ` · avg ${Math.round(n.avg_calories)} kcal` : ''}`}
                  </span>
                </div>
              ))}
            </div>
          )}
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
          {clients.length === 0 ? (
            <EmptyPanel icon={HeartPulse} title="No clients yet" description="Add clients to see cardio activity here." />
          ) : activeCardioClients.length === 0 ? (
            <EmptyPanel
              icon={HeartPulse}
              title="No cardio logged this week"
              description="No sessions with session_type = 'cardio' for your clients in the last 7 days."
            />
          ) : (
            <div className="px-5 pb-5 flex flex-col gap-2">
              {activeCardioClients.map((c) => (
                <div
                  key={c.client_id}
                  className="flex items-center justify-between text-sm bg-background border border-border rounded-lg px-3 py-2"
                >
                  <span className="text-foreground">{c.client_name}</span>
                  <span className="text-muted-foreground">
                    {c.cardio_sessions} session{c.cardio_sessions === 1 ? '' : 's'} · {Math.round(c.cardio_minutes)} min
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              Behind on cardio
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                Clients with the least cardio this week, furthest behind first
              </span>
            </CardTitle>
            <ArrowDownRight size={16} className="text-muted-foreground" />
          </CardHeader>
          {clients.length === 0 ? (
            <EmptyPanel icon={ArrowDownRight} title="No clients yet" description="Add clients to track cardio here." />
          ) : (
            <div className="px-5 pb-5 flex flex-col gap-2">
              {cardio.map((c) => (
                <div
                  key={c.client_id}
                  className="flex items-center justify-between text-sm bg-background border border-border rounded-lg px-3 py-2"
                >
                  <span className="text-foreground">{c.client_name}</span>
                  <span className={c.cardio_sessions === 0 ? 'text-danger' : 'text-muted-foreground'}>
                    {c.cardio_sessions === 0 ? 'No cardio this week' : `${Math.round(c.cardio_minutes)} min`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
