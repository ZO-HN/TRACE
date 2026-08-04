import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/shadcn/card';
import { ProgressRing } from '@/components/ui/shadcn/progress-ring';

export default function StatCard({
  label,
  value,
  icon: Icon,
  helperText,
  progress,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  helperText: string;
  progress?: number;
}) {
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        {progress !== undefined ? (
          <ProgressRing value={progress} size={28} strokeWidth={3} />
        ) : (
          <Icon size={16} className="text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
      </CardContent>
    </Card>
  );
}
