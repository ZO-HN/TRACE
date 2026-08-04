import { Sparkles, Zap, AlertTriangle, History, SlidersHorizontal, FileSearch } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/shadcn/tabs';
import AiBrainPanel from '@/components/chat/AiBrainPanel';
import { useProfile } from '@/components/layout/AppShell';

const automations = [
  { name: 'Weekly progression review', status: 'Active', lastRun: '2 hours ago' },
  { name: 'Missed check-in follow-up', status: 'Active', lastRun: '18 hours ago' },
  { name: 'Macro plan auto-adjust', status: 'Paused', lastRun: '3 days ago' },
];

const riskAlerts = [
  { client: 'Jordan P.', reason: 'Elevated fatigue markers across last 3 sessions', severity: 'warning' as const },
  { client: 'Sam R.', reason: 'Missed 2 consecutive scheduled workouts', severity: 'destructive' as const },
];

const history = [
  { prompt: 'Assign Hypertrophy Block A to all beginners', when: 'Today, 9:14 AM' },
  { prompt: 'Summarize risk alerts for this week', when: 'Yesterday, 4:02 PM' },
  { prompt: 'Draft check-in message for inactive clients', when: '2 days ago' },
];

export default function AiAgentPage() {
  const profile = useProfile();

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Sparkles size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">AI Agent Hub</h1>
          <p className="text-sm text-muted-foreground">
            Automated plans, risk alerts, and your prompt history — powered by the Copilot.
          </p>
        </div>
      </div>

      <Tabs defaultValue="automations">
        <TabsList>
          <TabsTrigger value="automations">
            <Zap size={14} /> Automations
          </TabsTrigger>
          <TabsTrigger value="risk">
            <AlertTriangle size={14} /> Risk Alerts
          </TabsTrigger>
          <TabsTrigger value="history">
            <History size={14} /> History
          </TabsTrigger>
          <TabsTrigger value="research">
            <FileSearch size={14} /> Research
          </TabsTrigger>
          <TabsTrigger value="prompt">
            <SlidersHorizontal size={14} /> System Prompt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="flex flex-col gap-3">
          {automations.map((job) => (
            <Card key={job.name}>
              <CardHeader>
                <CardTitle className="text-foreground text-sm font-semibold">{job.name}</CardTitle>
                <Badge variant={job.status === 'Active' ? 'success' : 'outline'}>{job.status}</Badge>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">Last run {job.lastRun}</CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="risk" className="flex flex-col gap-3">
          {riskAlerts.map((alert) => (
            <Card key={alert.client}>
              <CardHeader>
                <CardTitle className="text-foreground text-sm font-semibold">{alert.client}</CardTitle>
                <Badge variant={alert.severity}>{alert.severity === 'destructive' ? 'High risk' : 'Watch'}</Badge>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground">{alert.reason}</CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="flex flex-col gap-3">
          {history.map((h) => (
            <Card key={h.prompt}>
              <CardContent className="pt-5 flex items-center justify-between text-sm">
                <span className="text-foreground">"{h.prompt}"</span>
                <span className="text-xs text-muted-foreground">{h.when}</span>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="research">
          <AiBrainPanel userId={profile.id} />
        </TabsContent>

        <TabsContent value="prompt">
          <Card>
            <CardContent className="pt-5 flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Custom system prompt controls are coming soon. The Copilot currently uses a default
                coaching-assistant persona tuned for roster management and program design.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
