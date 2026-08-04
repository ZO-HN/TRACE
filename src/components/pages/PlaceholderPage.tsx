import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/shadcn/card';

export default function PlaceholderPage({
  title,
  icon: Icon,
}: {
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="p-6">
      <Card className="max-w-xl mx-auto mt-16">
        <CardContent className="pt-5 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Icon size={22} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
