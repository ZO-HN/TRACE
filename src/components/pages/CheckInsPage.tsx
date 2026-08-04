import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { key: 'needs-review', label: 'Needs review', empty: 'Nothing to review', description: 'Submitted check-ins from your whole roster show up here, oldest submission first.' },
  { key: 'overdue', label: 'Overdue', empty: 'Nothing overdue', description: 'Check-ins your clients missed their deadline for will show up here.' },
  { key: 'scheduled', label: 'Scheduled', empty: 'Nothing scheduled', description: 'Upcoming check-ins scheduled for your clients will show up here.' },
  { key: 'templates', label: 'Templates', empty: 'No templates yet', description: 'Build reusable check-in templates to send to your clients.' },
] as const;

export default function CheckInsPage() {
  const [active, setActive] = useState<(typeof tabs)[number]['key']>('needs-review');
  const current = tabs.find((t) => t.key === active)!;

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-lg font-bold text-foreground">Check-ins</h1>

      <div className="inline-flex w-fit items-center rounded-lg bg-muted p-1 text-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              'px-3 py-1.5 rounded-md font-medium transition-colors',
              active === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center gap-2 text-center py-24">
        <ClipboardCheck size={32} className="text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">{current.empty}</p>
        <p className="text-sm text-muted-foreground max-w-md">{current.description}</p>
      </div>
    </div>
  );
}
