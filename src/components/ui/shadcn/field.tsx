import * as React from 'react';
import { cn } from '@/lib/utils';

const fieldClass =
  'w-full h-10 bg-background border border-border rounded-lg px-3 text-sm text-foreground placeholder-muted-foreground focus:border-primary outline-none transition-colors';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium text-foreground', className)} {...props} />;
}

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(fieldClass, 'h-auto min-h-20 py-2 resize-y', className)}
      {...props}
    />
  );
}

function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(fieldClass, 'appearance-none', className)} {...props} />;
}

export { Label, Input, Textarea, Select, fieldClass };
