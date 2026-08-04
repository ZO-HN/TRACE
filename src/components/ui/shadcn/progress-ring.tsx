import { cn } from '@/lib/utils';

function ProgressRing({
  value,
  size = 44,
  strokeWidth = 4,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  return (
    <svg
      data-slot="progress-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('-rotate-90', className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className="stroke-border-soft fill-none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="stroke-primary fill-none transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

export { ProgressRing };
