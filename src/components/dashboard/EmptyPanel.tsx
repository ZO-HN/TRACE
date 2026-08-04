import type { LucideIcon } from 'lucide-react';

export default function EmptyPanel({
  icon: Icon,
  title,
  description,
  ctaLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-10 px-6">
      <Icon size={28} className="text-muted-foreground" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
      {ctaLabel && (
        <button type="button" className="text-xs font-medium text-primary hover:underline mt-1">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
