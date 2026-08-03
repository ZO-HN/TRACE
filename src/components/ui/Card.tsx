import type { ReactNode } from 'react';

export default function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-border rounded-2xl shadow-lg shadow-black/20 ${className}`}>
      {children}
    </div>
  );
}
