import type { ReactNode } from 'react';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_STYLES: Record<BadgeTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-green-500/15 text-green-400',
  warning: 'bg-yellow-500/15 text-yellow-400',
  danger: 'bg-red-500/15 text-red-400',
  neutral: 'bg-border/40 text-gray-500',
};

const TONE_DOT: Record<BadgeTone, string> = {
  primary: 'bg-primary',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
  neutral: 'bg-gray-400',
};

export default function Badge({
  children,
  tone = 'primary',
  pulse = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${TONE_STYLES[tone]}`}
    >
      {pulse && <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[tone]} animate-pulse`} />}
      {children}
    </span>
  );
}
