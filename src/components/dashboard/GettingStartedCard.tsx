import { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Progress } from '@/components/ui/shadcn/progress';

const STEPS = [
  'Create your coach profile',
  'Invite your first client',
  'Build a training program',
  'Send a check-in',
  'Connect payments',
];

export default function GettingStartedCard() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const complete = 1;

  if (dismissed) return null;

  return (
    <Card>
      <CardContent className="pt-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Getting started</span>
            <span className="text-xs text-muted-foreground">
              {complete} of {STEPS.length} complete
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? 'Collapse' : 'Expand'}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <Progress value={(complete / STEPS.length) * 100} />

        {expanded && (
          <ul className="flex flex-col gap-1.5 pt-1 text-sm">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-2 text-muted-foreground">
                <span
                  className={
                    i < complete
                      ? 'w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center text-[10px]'
                      : 'w-4 h-4 rounded-full border border-border-soft'
                  }
                >
                  {i < complete ? '✓' : ''}
                </span>
                <span className={i < complete ? 'text-foreground' : undefined}>{step}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
